// Existing authenticated connection; no localStorage and no source PDF upload.
export function createDraftStore(db, clientId, markId) {
  let current = null, busy = false;
  const unwrap = result => { if(result.error) throw result.error; return result.data; };
  async function exclusive(action) {
    if(busy) throw new Error('Another draft operation is still finishing.');
    busy=true;try{return await action();}finally{busy=false;}
  }
  return {
    async list() {
      return unwrap(await db.from('vb_filing_drafts').select('*').eq('client_id',clientId).eq('mark_id',markId).order('updated_at',{ascending:false}));
    },
    async load(id) {
      return exclusive(async()=>{
        const header=unwrap(await db.from('vb_filing_drafts').select('*').eq('id',id).eq('client_id',clientId).eq('mark_id',markId).single());
        const snapshot=unwrap(await db.from('vb_filing_revisions').select('input,revision,actor_id,created_at').eq('draft_id',id).eq('revision',header.revision).single());
        current=header;return {...current,input:structuredClone(snapshot.input)};
      });
    },
    async history() {
      if(!current)return [];
      return unwrap(await db.from('vb_filing_reviews').select('*').eq('draft_id',current.id).order('sequence',{ascending:true}));
    },
    async revisions() {
      if(!current)return [];
      return unwrap(await db.from('vb_filing_revisions').select('revision,actor_id,created_at').eq('draft_id',current.id).order('revision',{ascending:false}));
    },
    async save(input) {
      // Capture before awaiting, and advance only after successful database confirmation.
      const snapshot=structuredClone(input);
      return exclusive(async()=>{
        current=unwrap(await db.rpc('vb_save_filing_draft',{
          target_client:clientId,target_mark:markId,target_draft:current?.id??null,
          expected_revision:current?.revision??0,draft_input:snapshot
        }));
        return {...current,input:snapshot};
      });
    },
    async review(action,details) {
      if(!current)throw new Error('Save the draft before reviewing it.');
      const snapshot=structuredClone(details);
      return exclusive(async()=>unwrap(await db.rpc('vb_record_filing_review',{
        target_draft:current.id,expected_revision:current.revision,review_action:action,review_details:snapshot
      })));
    }
  };
}
