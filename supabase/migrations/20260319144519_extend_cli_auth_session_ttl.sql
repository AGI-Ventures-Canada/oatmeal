alter table cli_auth_sessions
  alter column expires_at set default (now() + interval '10 minutes');
