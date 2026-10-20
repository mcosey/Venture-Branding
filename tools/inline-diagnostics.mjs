import {readFile} from 'node:fs/promises';
// Strict replacement: a missing/changed import requires review, not a broken bundle.
export async function inlineDiagnostics(handler){
 const include="import {createDiagnostics} from '../../../shared/diagnostics.mjs';";
 if(!handler.includes(include))throw Error('Review changed diagnostic import before bundling.');
 const shared=await readFile(new URL('../shared/diagnostics.mjs',import.meta.url),'utf8');
 return shared+'\n'+handler.replace(include,'');
}
