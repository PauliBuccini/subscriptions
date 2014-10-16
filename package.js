Package.describe({
  name: "ground:subscriptions",
  version: "0.0.1",
  summary: "Grounds subscriptions",
  git: "https://github.com/GroundMeteor/subscriptions.git"
});

Package.on_use(function (api) {

  // api.export('_groundUtil');

  if (api.versionsFrom) {

    api.versionsFrom('METEOR@0.9.4');

    api.use('meteor-platform', ['client', 'server']);

    api.use([
      'meteor',
      'underscore',
      'ejson',
      'ground:util@0.0.2',
      'ground:localstorage@0.0.2',
      ], ['client', 'server']);

    api.use(['tracker'], 'client');

  } else {

    api.use('standard-app-packages', ['client', 'server']);

    api.use([
      'meteor',
      'underscore',
      'ejson',
      'ground-util',
      'ground-localstorage',
      ], ['client', 'server']);

    api.use(['deps'], 'client');

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
