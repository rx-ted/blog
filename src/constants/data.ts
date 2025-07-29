const server_url = 'https://github-serv-64.deno.dev';
// const server_url = 'http://localhost:34908';

const data = {
    auth: {
        login: `${server_url}/api/auth/login`,
    },
    user: {
        get: `${server_url}/api/user`,
        post: `${server_url}/api/user`,
        put: `${server_url}/api/user`,
        delete: `${server_url}/api/user`,
    },
    github: {
        'app_id': '1615478',
        'client_id': 'Iv23libiF0w1ybmvskWW',
        'client_secret': 'your github client secret',
        /** publish to prod, replace redirect_uri here. */
        'redirect_uri': 'http://localhost:5173/modules/utils/callback',
        'get_authorize_url': 'https://github.com/login/oauth/authorize',
        upload_file: `${server_url}/api/github/file`,
    }
};

export default data;