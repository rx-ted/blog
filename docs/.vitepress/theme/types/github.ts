export namespace githubConfig {
    // TODO(Ben): fix it
    export interface Content {
        message: string,
        committer: {
            name: string,
            email: string
        };
        content?: string; // base64 encode
        sha?: string; // when creating not use sha.
    }

    export interface GetRepoContent {
        owner: string;
        repo: string;
        path: string;
    }

    export interface UpdateRepoContent {
        owner: string;
        repo: string;
        path?: string;
        content: {
            message: string,
            committer: {
                name: string,
                email: string
            };
            content?: string; // base64 encode
            sha?: string; // when creating not use sha.
        }
    }

    export interface DeleteRepoContent {
        owner: string;
        repo: string;
        path: string;
        content: {
            message: string,
            committer: {
                name: string,
                email: string
            };
            sha: string;
        };
    }
}