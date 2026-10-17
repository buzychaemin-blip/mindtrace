-- No auth.users or personal records are inserted into the remote database.
-- Synthetic 14-day data is generated separately in the browser demo namespace
-- by src/domain.ts makeDemo(). This prevents demo records mixing with accounts.
select 'Use the explicitly labeled browser demo mode.' as seed_note;
