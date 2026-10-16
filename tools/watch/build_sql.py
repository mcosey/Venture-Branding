"""Build the exact rollback-only package. Does not execute SQL."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
folder = ROOT / 'supabase/proposals/trademark-watch'
setup = (folder / 'setup.sql').read_text().replace('commit;', '')
parts = [setup, (folder/'matcher-reference.test.sql').read_text(),
         (folder/'verify.sql').read_text().replace("select 'Watch verification reached end; outer wrapper must ROLLBACK' as result;", ''),
         (folder/'matcher-equivalence.sql').read_text(), 'rollback;',
         "select 'Watch checks including matcher equivalence passed; rollback completed' as result;"]
(folder/'test-rollback.sql').write_text('-- TEST imvkhicfmidzbzsbhkzs ONLY. All schema and fixtures roll back.\n'+'\n'.join(parts)+'\n')
