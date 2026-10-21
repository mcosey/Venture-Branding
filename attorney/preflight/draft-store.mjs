// Existing authenticated connection; no localStorage and no source PDF upload.
import {createDiagnostics,databaseCategory} from '../../shared/diagnostics.mjs';
export function createDraftStore(db, clientId, markId, {diagnostics}={}) {
  let current = null, busy = false;
  function failure(error,diagnostic,stage){
    const message=['PT409','40001'].includes(error?.code)?'Another saved version or review exists. Your edits are still here. Reopen the saved version before continuing.':error?.code==='22023'?'Check the filing details and required review confirmation.':'Unable to load or save the filing draft. Your edits have not been discarded.';
    const e=error?.code==='22023'?new Error(message):diagnostic.error(stage,message,error?.code==='PT409'?'conflict':databaseCategory(error?.code));
    if(['PT409','40001','22023','42501','42P01','42883','PGRST202','PGRST205'].includes(error?.code))e.code=error.code;
    return e;
  }
  async function request(stage,action){
    const diagnostic=createDiagnostics('filing',diagnostics);let result;
    try{result=await action();}catch{throw failure(null,diagnostic,stage);}
    if(result.error)throw failure(result.error,diagnostic,stage);return result.data;
  }
  async function exclusive(action) {
    if(busy) throw new Error('Another draft operation is still finishing.');
    busy=true;try{return await action();}finally{busy=false;}
  }
  return {
    async list() {
      return request('list',()=>db.from('vb_filing_drafts').select('*').eq('client_id',clientId).eq('mark_id',markId).order('updated_at',{ascending:false}));
    },
    async load(id) {
      return exclusive(async()=>{
        const header=await request('load',()=>db.from('vb_filing_drafts').select('*').eq('id',id).eq('client_id',clientId).eq('mark_id',markId).single());
        const snapshot=await request('load',()=>db.from('vb_filing_revisions').select('input,revision,actor_id,created_at').eq('draft_id',id).eq('revision',header.revision).single());
        current=header;return {...current,input:structuredClone(snapshot.input)};
      });
    },
    async history() {
      if(!current)return [];
      return request('history',()=>db.from('vb_filing_reviews').select('*').eq('draft_id',current.id).order('sequence',{ascending:true}));
    },
    async revisions() {
      if(!current)return [];
      return request('revisions',()=>db.from('vb_filing_revisions').select('revision,actor_id,created_at').eq('draft_id',current.id).order('revision',{ascending:false}));
    },
    async save(input) {
      // Capture before awaiting, and advance only after successful database confirmation.
      const snapshot=structuredClone(input);
      return exclusive(async()=>{
        current=await request('save',()=>db.rpc('vb_save_filing_draft',{
          target_client:clientId,target_mark:markId,target_draft:current?.id??null,
          expected_revision:current?.revision??0,draft_input:snapshot
        }));
        return {...current,input:snapshot};
      });
    },
    async review(action,details) {
      if(!current)throw new Error('Save the draft before reviewing it.');
      const snapshot=structuredClone(details);
      return exclusive(()=>request('review',()=>db.rpc('vb_record_filing_review',{
        target_draft:current.id,expected_revision:current.revision,review_action:action,review_details:snapshot
      })));
    }
  };
}
