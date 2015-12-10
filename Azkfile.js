/**
 * Documentation: http://docs.azk.io/Azkfile.js
 */
systems({
    'azkdjango': {
        depends: ["postgres", "nginx"],
        image: {"docker": "azukiapp/python:3.4"},
        provision: [
            "pip install --user --allow-all-external -r requirements.txt",
            "python manage.py migrate",

        ],
        workdir: "/azk/#{manifest.dir}",
        shell: "/bin/bash",
        command: "gunicorn  #{manifest.dir}.wsgi:application --bind 0.0.0.0:$HTTP_PORT",
        wait: 20,
        mounts: {
            '/azk/#{manifest.dir}': sync("."),
            '/azk/pythonuserbase': persistent("pythonuserbase"),
        },
        scalable: {"default": 1},
        http: {
            domains: [
                "#{env.HOST_DOMAIN}",
                "#{env.HOST_IP}",
                "#{system.name}.#{azk.default_domain}",]
        },
        envs: {
            PATH: "/azk/pythonuserbase/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
            PYTHONUSERBASE: "/azk/pythonuserbase",
        },
    },
    postgres: {
        image: {"docker": "azukiapp/postgres:9.4"},
        shell: "/bin/bash",
        wait: 25,
        mounts: {
            '/var/lib/postgresql/data': persistent("#{system.name}-data"),
        },
        ports: {
            data: "5432/tcp",
        },
        envs: {
            POSTGRES_USER: "azkdjango",
            POSTGRES_PASS: "azkdjango",
            POSTGRES_DB: "#{manifest.dir}",
        },
        export_envs: {
            DATABASE_URL: "postgres://#{envs.POSTGRES_USER}:#{envs.POSTGRES_PASS}@#{net.host}:#{net.port.data}/${envs.POSTGRES_DB}",
        },
    },
    nginx: {
        image: {"docker": "nginx"},
        shell: "/bin/bash",
        wait: 25,
        mounts: {
            "/etc/nginx/conf.d/": path('nginx'),
            "/azk/#{manifest.dir}/static": path("static"),
        },
        http: {
            domains: ["#{system.name}.#{azk.default_domain}"]
        },
        ports: {
            http: "80/tcp"
        },
        export_envs: {
            STATIC_URL: "http://#{net.host}:#{net.port.http}/static/",
            STATIC_ROOT: "/azk/#{manifest.dir}/static/"

        },

    },
    deploy: {
        image: {"docker": "azukiapp/deploy-digitalocean"},
        mounts: {
            "/azk/deploy/src": path("."),
            "/azk/deploy/.ssh": path("#{env.HOME}/.ssh"),
            "/azk/deploy/.config": persistent("deploy-config"),
        },
        scalable: {"default": 0, "limit": 0},
    },
});
