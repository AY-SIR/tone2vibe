-- Add sample payment data for testing
INSERT INTO public.payments (user_id, payment_id, amount, currency, status, plan, created_at) 
VALUES 
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 'pi_test_1234567890', 29.99, 'USD', 'completed', 'pro', now() - interval '5 days'),
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 'pi_test_0987654321', 49.99, 'USD', 'completed', 'premium', now() - interval '15 days'),
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 'pi_test_5555555555', 9.99, 'USD', 'failed', null, now() - interval '2 days');

-- Add sample orders data for testing  
INSERT INTO public.orders (user_id, stripe_session_id, amount, currency, status, words_purchased, plan, created_at)
VALUES 
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 'cs_test_1111111111', 2999, 'usd', 'paid', 5000, 'pro', now() - interval '5 days'),
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 'cs_test_2222222222', 4999, 'usd', 'paid', 10000, 'premium', now() - interval '15 days'),
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 'cs_test_3333333333', 999, 'usd', 'pending', 1000, null, now() - interval '1 day');

-- Add sample word purchases for testing
INSERT INTO public.word_purchases (user_id, words_purchased, amount_paid, currency, status, payment_id, created_at)
VALUES 
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 5000, 29.99, 'USD', 'completed', 'pi_test_1234567890', now() - interval '5 days'),
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 10000, 49.99, 'USD', 'completed', 'pi_test_0987654321', now() - interval '15 days'),
  ('b39284bb-bf1e-4eb1-9943-91910e514cd5', 1000, 9.99, 'USD', 'failed', 'pi_test_5555555555', now() - interval '2 days');