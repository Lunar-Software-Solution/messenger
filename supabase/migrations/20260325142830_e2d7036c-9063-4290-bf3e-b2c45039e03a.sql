ALTER TABLE public.message_session DROP CONSTRAINT single_row;

INSERT INTO public.message_session (id, status, platform)
VALUES (2, 'disconnected', 'signal'), (3, 'disconnected', 'telegram'), (4, 'disconnected', 'wechat');