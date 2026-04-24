-- Add 'voice' to messages.channel CHECK constraint
-- Previously only: whatsapp, sms, rsvp_link
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_check;
ALTER TABLE messages ADD CONSTRAINT messages_channel_check
  CHECK (channel = ANY (ARRAY['whatsapp'::text, 'sms'::text, 'rsvp_link'::text, 'voice'::text]));
