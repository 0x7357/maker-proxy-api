# maker-proxy-api

## Usage

1. `yarn install`
2. `yarn start`

Server will listen on `http://localhost:3000`

`http://localhost:3000/api/v1/svenskaspel/getLeagues?sportIds=36`
(You can use multiple sport ids: `?sportIds=35,36`)

`http://localhost:3000/api/v1/svenskaspel/getEvents?leagueIds=203394`
(You can use multiple league ids: `?leagueIds=203394,203395`)
