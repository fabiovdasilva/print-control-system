# PrintFlow — Confiabilidade de login e cadastro

## Intenção

Eliminar o travamento percebido no login e no cadastro de cliente, assegurando que a central sempre apresente a senha ao abrir e que uma falha de rede retorne uma mensagem em vez de bloquear a tela.

## Escopo

- A página inicial e o HTML de entrada não podem ficar em cache no navegador.
- A tela de login leve é a única porta de entrada do painel; não restaura uma sessão automaticamente.
- O painel React não contém uma segunda tela de login nem consulta sessão ao carregar.
- Requisições administrativas recebem tempo limite e retornam erro compreensível.
- Cadastro valida nome e intervalo, fecha assim que o servidor confirma e atualiza a lista em segundo plano.
- O instalador continua vinculado a um único cliente por ID e token, sem expor o token no painel.

## Decisões

- Usar `Cache-Control: no-store` para `index.html`; arquivos com hash permanecem cacheáveis porque cada build altera seus nomes.
- Manter a sessão no servidor por 12 horas para as chamadas do painel, mas exigir a senha para abrir ou recarregar a interface.
- Não aguardar a atualização completa do dashboard depois de criar um cliente; o cadastro já confirmado fica disponível para interação enquanto a lista é atualizada.
- Executar uma central temporária com banco isolado para validar as APIs e não gravar registros de teste no banco operacional.

## Fora de escopo

- Alterar senha, dados reais, impressoras reais ou instalar agentes em máquinas de clientes durante os testes.
- Mudar o protocolo já usado pelo agente.
