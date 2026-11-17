-- Make yourself the first admin. Replace the value with your GitHub username (or your email)
-- in lower case, then run once. After this, add other admins in the app: Admin → Settings.
insert into public.admins (identity, added_by)
values (lower('your-github-username'), 'setup')
on conflict (identity) do nothing;
