const Crypto = require('crypto');
const WebSocket = require('ws');

const webSocketUrl = `wss://sbapi.sbtech.com/svenskaspel/sportscontent/sportsbook/v1/Websocket?jwt=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NTkxNzMyNDIsImlzcyI6IlN2ZW5za2FTcGVsX1Byb2RSIiwiU2l0ZUlkIjozNjYsIklzQW5vbnltb3VzIjp0cnVlLCJTZXNzaW9uSWQiOiIzZmUyM2Y0Yi1hNTliLTQ0ZGItYjQxNS1hODZjNjRmNGQwY2UiLCJuYmYiOjE2NTkxNjYwNDIsImlhdCI6MTY1OTE2NjA0Mn0.Opf5KEfUN3spfLpBML0DAblGDPCZYOlxnO3fuINVBagGVA2gFTCG8mkkjB7XQfU0zf8OUxyqYfCScIaKnLZCJcEFUzopHRVUb0E3dcGGX-pI_hSys7X4mypRJo9C38A9IXu2dI-Iydmw3HR7j2k71qyFoTttpeU0d_XOxaxiW7H7YUHPazcTtpQcMMjpA05Yld5mDzD5-iQm5Dt1icl_K3Qf2PanwFrWl90J5wpy67wFoFG7AN9u54KE5cE0kkuk8o5lOG6ffyi3MPIY55S4QFEKf5SAM0GhzED5v__amjWVtkYJNDWEZioe7n9WepF_GxrGZwbtfvgjBy7WJiVhoA&locale=se`;

module.exports = new (class SvenskaSpel {
  constructor() {
    const webSocket = new WebSocket(webSocketUrl);
    this.webSocketMessageProcessors = new Map();

    webSocket.addEventListener('open', this._onWebSocketOpen.bind(this));
    webSocket.addEventListener('message', this._onWebSocketMessage.bind(this));
    webSocket.addEventListener('error', this._onWebSocketError.bind(this));
    webSocket.addEventListener('close', this._onWebSocketClose.bind(this));

    this.webSocket = webSocket;
  }

  _onWebSocketOpen() {}
  _onWebSocketMessage(event) {
    const { data } = event;
    const jsonData = JSON.parse(data);

    if (this.webSocketMessageProcessors.has(jsonData.id)) {
      const processor = this.webSocketMessageProcessors.get(jsonData.id);
      processor(jsonData);
    }
  }
  _onWebSocketError() {}
  _onWebSocketClose() {}

  getRoutes() {
    return [
      {
        type: 'get',
        path: 'getLeagues',
        controller: (req, res, next) => {
          const { sportIds } = req.query;

          const payloadId = Crypto.randomUUID();

          const payload = {
            id: payloadId,
            jsonrpc: '2.0',
            method: 'GetLeaguesBySportId',
            params: {
              ids: sportIds.split(','),
            },
          };

          this.webSocketMessageProcessors.set(payloadId, (data) => {
            const { leagues } = data?.result;

            this.webSocketMessageProcessors.delete(payloadId);

            res.json(leagues);
          });

          this.webSocket.send(JSON.stringify(payload));
        },
      },
      {
        type: 'get',
        path: 'getEvents',
        controller: (req, res, next) => {
          const { leagueIds } = req.query;

          const payloadId = Crypto.randomUUID();

          const payload = {
            id: payloadId,
            jsonrpc: '2.0',
            method: 'GetEventsByLeagueId',
            params: {
              eventState: 'Mixed',
              eventTypes: ['Outright'],
              ids: leagueIds.split(','),
              pagination: {
                top: 100,
                skip: 0,
              },
            },
          };

          this.webSocketMessageProcessors.set(payloadId, (data) => {
            const { markets } = data?.result;

            const odds = {};

            markets.forEach((market) => {
              const { betslipLine: mBetslipLine, selections } = market;

              selections.forEach((selection) => {
                const { betslipLine: sBetslipLine, displayOdds } = selection;

                if (!odds[mBetslipLine]) {
                  odds[mBetslipLine] = {};
                }

                odds[mBetslipLine][sBetslipLine] = parseFloat(displayOdds?.decimal);
              });
            });

            this.webSocketMessageProcessors.delete(payloadId);

            res.json(odds);
          });

          this.webSocket.send(JSON.stringify(payload));
        },
      },
    ];
  }
})();
