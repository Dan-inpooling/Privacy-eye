class Dict {

    constructor() {
        this.content = {};
    }

    get(...path) {
        let res = this.content;
        for (let e of path) {
            if (!(e in res))
                return undefined;
            res = res[e];
        }
        return res;
    }

    in(...path) {
        let res = this.content;
        for (let e of path) {
            if (!(e in res))
                return false;
            res = res[e];
        }
        return true;
    }

    set(val, ...path) {
        let res = this.content;
        let last_path = path[path.length - 1];
        path = path.slice(0, path.length - 1);

        for (let e of path) {
            if (!(e in res))
                res[e] = {};
            res = res[e];
        }
        res[last_path] = val;
    }
}

