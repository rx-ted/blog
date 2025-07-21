const data = {
    github: {
        "app_id": "1615478",
        "client_id": 'Iv23libiF0w1ybmvskWW',
        "client_secret": 'your github client secret',
        /** publish to prod, replace redirect_uri here. */
        "redirect_uri": "http://localhost:5173/modules/utils/callback",
        "get_authorize_url": "https://github.com/login/oauth/authorize",
        "access_token_url": "https://github-serv-64.deno.dev/api/github/token",
        // "access_token_url": "http://0.0.0.0:34908/api/github/token",
        "get_user_url": "https://github-serv-64.deno.dev/api/github/user",
        // "get_user_url": "http://0.0.0.0:34908/api/github/user",


    }
}



export default data;