Package.describe({
  name: "ground:subscriptions",
  version: "0.0.1",
  summary: "Grounds subscriptions",
  git: "https://github.com/GroundMeteor/subscriptions.git"
});

Package.on_use(function (api) {

  // api.export('_groundUtil');

  if (api.versionsFrom) {

    api.versionsFrom('METEOR@1.2.1');

    api.use('meteor-platform', ['client', 'server']);

    api.use([
      'meteor',
      'underscore',
      'ejson',
      'ground:util@0.3.14-rc.3',
      'raix:localforage-localstorage@1.2.4-rc.1',
      ], ['client', 'server']);

    api.use(['tracker'], 'client');

  }

  api.add_files('subscriptions.client.js', 'client');

  api.add_files('subscriptions.server.js', 'server');
});

Package.on_test(function (api) {
  if (api.versionsFrom) {
    api.use('ground:subscriptions', ['client', 'server']);
  } else {
    api.use('ground-subscriptions', ['client', 'server']);
  }
  api.use('test-helpers', 'client');
  api.use(['tinytest', 'underscore', 'ejson']);

  api.add_files('subscriptions.tests.js', 'client');

});
