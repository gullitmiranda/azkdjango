/**
 * Documentation: http://docs.azk.io/Azkfile.js
 */
systems({
  'azkdjango': {
    depends: ["postgres", "static"],
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
      '/azk/#{manifest.dir}'       : sync("."),
      "/azk/#{manifest.dir}/static": persistent("static"),
      '/azk/pythonuserbase'        : persistent("pythonuserbase"),
    },
    scalable: {"default": 1},
    http: {
      domains: [ "#{system.name}.#{azk.default_domain}", ]
    },
    envs: {
      PATH          : "/azk/pythonuserbase/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      PYTHONUSERBASE: "/azk/pythonuserbase",
      // STATIC_ROOT   : "/azk/#{manifest.dir}/static/",
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
  static: {
    image: {"docker": "nginx"},
    shell: "/bin/bash",
    wait: 25,
    mounts: {
      "/etc/nginx/conf.d/"         : path('nginx'),
      "/azk/#{manifest.dir}/static": persistent("static"),
    },
    http: {
      domains: [
        "#{system.name}.#{azk.default_domain}",
        "#{system.name}.#{env.HTTP_HOSTNAME}",
        "#{system.name}.#{env.HTTP_IP}",
      ]
    },
    ports: {
      http: "80/tcp"
    },
    export_envs: {
      STATIC_URL : "http://#{net.host}/",
      STATIC_ROOT: "/azk/#{manifest.dir}/static/",
    }
  },
  // azkdjango in remote server
  prod: {
    extends: "azkdjango",
    http: {
      domains: [
        "#{env.HOST_DOMAIN}",
        "#{env.HOST_IP}",
        "#{system.name}.#{azk.default_domain}",
      ]
    },
    scalable: {"default": 0, "limit": 0},
  },
  deploy: {
    image: {"docker": "azukiapp/deploy-digitalocean"},
    mounts: {
      "/azk/deploy/src"    : path("."),
      "/azk/deploy/.ssh"   : path("#{env.HOME}/.ssh"),
      "/azk/deploy/.config": persistent("deploy-config"),
    },
    scalable: {"default": 0, "limit": 0},
    envs: {
      BOX_BACKUP               : true,
      AZK_RESTART_COMMAND      : "azk restart postgres && azk restart prod -R -vvvv",
      // HOST_DOMAIN              : "your.domain",
    },
  },
});
