#!/bin/bash
# Script para criar um usuário de teste no Supabase

# Credenciais de teste
TEST_EMAIL="admin@mototaxi.com"
TEST_PASSWORD="Senha@123"

echo "🔧 Criando usuário de teste no Supabase..."
echo "Email: $TEST_EMAIL"
echo "Senha: $TEST_PASSWORD"
echo ""
echo "Para criar o usuário:"
echo "1. Vá para https://supabase.com/dashboard"
echo "2. Selecione o projeto MOTOTAXI"
echo "3. Vá para Authentication → Users"
echo "4. Clique em 'Add user'"
echo "5. Use o email e senha acima"
echo ""
echo "Após criar o usuário, execute no SQL Editor para torná-lo admin:"
echo ""
echo "INSERT INTO public.user_roles (user_id, role)"
echo "SELECT id, 'admin' FROM auth.users WHERE email = '$TEST_EMAIL';"
echo ""
echo "✅ Pronto! Agora você pode fazer login no painel admin"
