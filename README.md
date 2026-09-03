# IBB YouTube Analytics — Firebase Realtime Database

Versão sem VPS, sem Node e sem dependência do Web App do Apps Script no navegador.

## Arquitetura

```text
YouTube Data API + YouTube Analytics API
                ↓
          Google Apps Script
                ↓
      Firebase Realtime Database
                ↓
    GitHub Pages (HTML/CSS/JS)
```

O Apps Script funciona apenas como coletor agendado. O dashboard lê um JSON persistente no Firebase, por isso abre rapidamente e funciona da mesma forma em Chrome, Edge, Firefox, Safari e celulares.

**Não há dados fictícios.** Se um período ainda não foi gravado, o painel mostra que os dados reais ainda não estão disponíveis.

## Estrutura do banco

```text
youtubeDashboard/
├── meta/
├── periods/
│   ├── 30d/
│   ├── 6m/
│   └── 12m/
└── details/
    └── VIDEO_ID/
```

## 1. Criar o Realtime Database

No Firebase Console:

1. Abra seu projeto (ou crie um novo).
2. Vá em **Build > Realtime Database**.
3. Crie o banco.
4. Copie a **URL do Realtime Database**.
5. Em **Regras**, publique o conteúdo de `firebase-rules.json`.

As regras deixam somente `youtubeDashboard` público para leitura e bloqueiam escrita pelo navegador. A escrita do Apps Script é autenticada por uma conta de serviço.

## 2. Gerar a conta de serviço

No Firebase:

**Configurações do projeto > Contas de serviço > Gerar nova chave privada**.

Será baixado um JSON. Ele contém uma chave privada e **nunca deve ir para o GitHub ou para o JavaScript do site**.

## 3. Configurar o Apps Script

Use `apps-script/Code.gs`.

Mantenha/adicone os serviços avançados:

- YouTube Data API v3 (`YouTube`)
- YouTube Analytics API v2 (`YouTubeAnalytics`)

Em **Configurações do projeto > Propriedades do script**, crie duas propriedades:

### `FIREBASE_DATABASE_URL`

Exemplo:

```text
https://meu-projeto-default-rtdb.firebaseio.com
```

Use a URL exata mostrada pelo seu Realtime Database; algumas regiões usam `firebasedatabase.app`.

### `FIREBASE_SERVICE_ACCOUNT_JSON`

Cole o conteúdo **completo** do JSON baixado em Contas de serviço.

Depois execute no editor:

1. `autorizar()` — uma vez, para liberar acesso ao canal IBB Parnaíba.
2. `prepararFirebase()` — testa o Firebase, grava 30 dias e instala os gatilhos.

Para preencher todos os períodos imediatamente, execute também, um por vez:

```text
sincronizar6m
sincronizar12m
sincronizarPicosFirebase
sincronizarDetalhesFirebase
```

Também existe `sincronizarTudoFirebase()`, mas executar separadamente é mais seguro contra limite de tempo do Apps Script.

### Não precisa mais publicar o Apps Script como Web App

A URL `/exec`, JSONP, `/u/2/` e o comportamento de múltiplas contas deixam de participar do dashboard.

## 4. Atualização automática

`prepararFirebase()` cria estes gatilhos:

- **30 dias:** 15 minutos
- **6 meses:** 1 hora
- **12 meses:** 6 horas
- **picos das lives:** 1 hora
- **curvas de retenção/simultâneos:** 6 horas, em rodízio

O horário da última atualização fica gravado junto do snapshot e aparece no rodapé do painel.

## 5. Configurar o frontend

Abra `js/config.js`:

```javascript
const CONFIG_APP = {
  FIREBASE_DATABASE_URL: "https://SEU-BANCO.firebaseio.com",
  FIREBASE_ROOT: "youtubeDashboard",
  TEMPO_LIMITE_MS: 8000
};
```

É só isso. O frontend **não recebe** API Key do YouTube, OAuth token nem chave privada do Firebase.

## 6. GitHub Pages

Envie para o repositório:

```text
index.html
css/
js/
```

O arquivo `firebase-rules.json` pode ficar no repositório; ele não contém segredo. A chave da conta de serviço **não pode** ficar no repositório.

## Leitura do frontend

O JavaScript usa a API REST do Firebase, por exemplo:

```text
https://SEU-BANCO/youtubeDashboard/periods/30d.json
```

Ao clicar em 6 meses, ele lê somente `periods/6m`; ao clicar em 12 meses, somente `periods/12m`. Nenhuma consulta ao YouTube acontece durante a abertura da página.

## Atualização manual

Quando quiser forçar dados novos imediatamente, execute no Apps Script a função correspondente ao período:

```text
sincronizar30d
sincronizar6m
sincronizar12m
```

Depois basta clicar no botão de atualizar do dashboard para reler o Firebase.
