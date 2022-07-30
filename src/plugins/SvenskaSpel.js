const Axios = require('axios');
const Crypto = require('crypto');
const WebSocket = require('ws');

module.exports = new (class SvenskaSpel {
  constructor() {
    this.webSocketMessageProcessors = new Map();

    const self = this;

    (async () => {
      const { data } = await Axios.post('https://sbapi.sbtech.com/svenskaspel/auth/v2/anonymous', null, {
        headers: {
          domainid: 'Sj9RYJD8NcNQkvK1q94G',
        },
      });

      const webSocketUrl = `wss://sbapi.sbtech.com/svenskaspel/sportscontent/sportsbook/v1/Websocket?jwt=${data.jwt}&locale=se`;

      const webSocket = new WebSocket(webSocketUrl);

      webSocket.addEventListener('open', self._onWebSocketOpen.bind(self));
      webSocket.addEventListener('message', self._onWebSocketMessage.bind(self));
      webSocket.addEventListener('error', self._onWebSocketError.bind(self));
      webSocket.addEventListener('close', self._onWebSocketClose.bind(self));

      self.webSocket = webSocket;
    })();
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
