-- Add recovery message template column to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS recovery_message_template text 
DEFAULT 'Olá {cliente}, notamos que você deixou um {pedido} no carrinho na {loja}. Quer finalizar seu pedido agora?';

-- Add comment for documentation
COMMENT ON COLUMN public.stores.recovery_message_template IS 'Template for abandoned cart recovery WhatsApp messages. Variables: {cliente}, {loja}, {pedido}';