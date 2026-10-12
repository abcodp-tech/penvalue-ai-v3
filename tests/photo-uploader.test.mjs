import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.slice(html.indexOf('<script>')+8,html.indexOf('</script>'));
const slotsStart=script.indexOf('// Copy is assigned by the page\'s existing six-language changeLanguage() branches.');
const slotsEnd=script.indexOf('\nfunction askForValuerPassword()',slotsStart);
assert.ok(slotsStart>=0&&slotsEnd>slotsStart,'slot controller block exists');

function makeElement(tagName='div'){
  let markup='';
  return {
    tagName,children:[],dataset:{},attributes:{},className:'',value:'',files:[],clickCount:0,
    set innerHTML(value){markup=value;if(value==='')this.children=[];},get innerHTML(){return markup;},
    setAttribute(name,value){this.attributes[name]=value;},appendChild(child){this.children.push(child);return child;},
    click(){this.clickCount++;}
  };
}

function makeContext(){
  const ids={
    'slot-file':makeElement('input'),
    'photo-slot-grid':makeElement('div'),
    'photo-slot-intro':makeElement('p'),
    'photo-slot-help':makeElement('p'),
    'original-photos':makeElement('div')
  };
  const revoked=[];
  const URLApi={createObjectURL:file=>'blob:'+file.id,revokeObjectURL:url=>revoked.push(url)};
  const context=vm.createContext({
    photos:Array(12).fill(null),
    document:{getElementById:id=>ids[id],createElement:tag=>makeElement(tag)},
    crypto:webcrypto,URL:URLApi,alert:message=>context.alerts.push(message),alerts:[],
    console
  });
  vm.runInContext(script.slice(slotsStart,slotsEnd),context);
  return {context,ids,revoked};
}

function imagesIn(grid){return grid.children.map(card=>card.children.find(child=>child.tagName==='img'));}
function file(id,bytes){return {id,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};}
async function choose(context,files,slot,selected){
  vm.runInContext(`choosePhotoSlot(${slot})`,context);
  files.files=[selected];
  vm.runInContext('files.onchange()',context);
  await vm.runInContext('photoSelectionPending',context);
}

test('main customer page uses 12 fixed numbered example slots and removes the standalone guide',()=>{
  const {context,ids}=makeContext();
  const grid=ids['photo-slot-grid'];
  assert.equal(grid.children.length,12);
  assert.deepEqual(grid.children.map(card=>card.dataset.photoSlot),Array.from({length:12},(_,i)=>String(i+1)));
  assert.deepEqual(imagesIn(grid).map(image=>image.src),Array.from({length:12},(_,i)=>`photo-examples/slot-${String(i+1).padStart(2,'0')}.webp`));
  assert.ok(imagesIn(grid).every(image=>image.loading==='lazy'&&image.decoding==='async'));
  assert.match(html,/@media\(min-width:900px\)\{\.photo-slot-grid\{grid-template-columns:repeat\(4/);
  assert.match(html,/@media\(max-width:650px\)[\s\S]*?\.photo-slot-grid\{grid-template-columns:repeat\(2/);
  assert.match(html,/Never force a pen open or remove a part\./);
  assert.doesNotMatch(html,/PenValue AI_ 12-Photo Fountain Pen Guide\.png|class="photo-guide"|class="drop"/);
  assert.equal(vm.runInContext('getSelectedPhotoSlots().length',context),0);
});

test('entire inline page script parses and submission waits for pending local replacement',()=>{
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.match(script,/async function startPayment\(\)\{\s*await photoSelectionPending;[\s\S]*?const selectedSlots=getSelectedPhotoSlots\(\)/);
  assert.match(script,/async function submitPen\(\)\{\s*await photoSelectionPending;[\s\S]*?const selectedSlots=getSelectedPhotoSlots\(\)/);
  assert.match(script,/photoNumber:\s*selectedSlots\[index\]\.slot/);
  assert.match(script,/JSON\.stringify\(\{\s*submissionId:\s*submissionId,\s*photo:\s*photo,\s*photoNumber:/);
});

test('selecting a customer photo replaces only that slot example and local replacement revokes the stale preview',async()=>{
  const {context,ids,revoked}=makeContext();
  const first=file('first',[1,2,3]),replacement=file('replacement',[4,5,6]);
  await choose(context,vm.runInContext('files',context),8,first);
  let images=imagesIn(ids['photo-slot-grid']);
  assert.match(ids['photo-slot-grid'].children[7].className,/is-complete/);
  assert.match(ids['photo-slot-grid'].children[7].innerHTML,/8 ✓/);
  assert.equal(images[7].src,'blob:first');
  assert.match(images[7].className,/photo-slot-preview/);
  assert.equal(images[6].src,'photo-examples/slot-07.webp');
  await choose(context,vm.runInContext('files',context),8,replacement);
  images=imagesIn(ids['photo-slot-grid']);
  assert.equal(images[7].src,'blob:replacement');
  assert.equal(images[6].src,'photo-examples/slot-07.webp');
  assert.deepEqual(revoked,['blob:first']);
  const selected=JSON.parse(vm.runInContext('JSON.stringify(getSelectedPhotoSlots().map(item=>({id:item.file.id,slot:item.slot})))',context));
  assert.deepEqual(selected,[{id:'replacement',slot:8}]);
});

test('sparse selected files retain fixed slot numbers and duplicate files are rejected',async()=>{
  const {context,ids}=makeContext();
  const repeated=file('same',[7,8,9]);
  await choose(context,vm.runInContext('files',context),2,repeated);
  await choose(context,vm.runInContext('files',context),11,repeated);
  const distinct=file('distinct',[10,11,12]);
  await choose(context,vm.runInContext('files',context),11,distinct);
  const selected=JSON.parse(vm.runInContext('JSON.stringify(getSelectedPhotoSlots().map(item=>item.slot))',context));
  assert.deepEqual(selected,[2,11]);
  assert.equal(ids['photo-slot-grid'].children[10].dataset.photoSlot,'11');
  assert.equal(context.alerts.length,1);
  assert.match(context.alerts[0],/already in another slot/);
  assert.match(html,/photoNumber:\s*selectedSlots\[index\]\.slot/);
  assert.match(html,/getSelectedPhotoSlots\(\).*selectedSlots\.length===0/s);
});

test('six-language copy keeps image examples independent and preserves the safe #8 wording',()=>{
  const {context,ids}=makeContext();
  const examples=imagesIn(ids['photo-slot-grid']).map(image=>image.src);
  const languages=JSON.parse(vm.runInContext('JSON.stringify(PHOTO_SLOT_LANGUAGES)',context));
  assert.deepEqual(Object.keys(languages).sort(),['de','es','fr','it','pt']);
  assert.equal(vm.runInContext('PHOTO_SLOT_GUIDANCE[7][1]',context),'Only if accessible without force');
  const expected={
    es:'Solo si es accesible sin forzar',
    fr:'Seulement si accessible sans forcer',
    de:'Nur wenn ohne Kraft zugänglich',
    it:'Solo se accessibile senza forzare',
    pt:'Só se acessível sem forçar'
  };
  for(const [lang,wording] of Object.entries(expected)){
    assert.equal(languages[lang].guidance[7][1],wording);
    assert.match(languages[lang].intro,/\bNunca\b|\bNe forcez\b|\bniemals\b|\bNon forzare\b|\bNunca force\b/);
    vm.runInContext(`applyPhotoSlotLanguage('${lang}')`,context);
    assert.deepEqual(imagesIn(ids['photo-slot-grid']).map(image=>image.src),examples);
  }
  assert.equal(languages.es.guidance[10][0],'Debajo del clip');
  assert.equal(languages.es.guidance[11][0],'Caja y documentos');
  assert.equal(languages.fr.guidance[10][0],'Sous l’agrafe');
  assert.equal(languages.fr.guidance[11][0],'Boîte et documents');
  assert.equal(ids['photo-slot-intro'].textContent,languages.pt.intro);
  assert.equal(ids['photo-slot-help'].textContent,languages.pt.help);
  assert.equal(vm.runInContext('PHOTO_SLOT_GUIDANCE[10][0]',context),'Por baixo do clipe');
  assert.equal(vm.runInContext('PHOTO_SLOT_GUIDANCE[11][0]',context),'Caixa e documentos');
});
