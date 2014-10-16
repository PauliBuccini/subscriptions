/*

Ground.subscribe

Grounding subscribe means that we accumulate the data the user has access to
on the server. To make sure this data amount doesnt break storage quotas on
limited platforms like mobile we use an "expiration strategy".

We actually need to persist the subscriptions in storage to resume the
subscriptions after the app loads. The strategy will ensure that this use is
limited.

When ever the user actively subscribes to data the subscription will grow in
weight meaning that the subscription is used and in some way important to the
user.

We allow the user to reset the system if ever needed - but the system should
perhaps reset itself on Meteor.user change.

Thanks goes to @arunoda for his https://github.com/meteorhacks/subs-manager.git

*/

// Persisted subscriptions
var storedSubscriptions = Store.create({
    name: '_ground_subscriptions',
    version: 1.1
  });

// Track the in memory subscriptions
var trackSubscriptions = {};

// Flag marking when all stored subscriptions are loaded
var allStoredSubscriptionsAreLoaded = false;

// Noop callback - true we use async storage, but it doesnt mean we actually
// want to use the callback
var noopCallback = function(err, result) {};

// Simple store item
var storeItem = function(id, item) {
  if (allStoredSubscriptionsAreLoaded) {
    // Store the item
    storedSubscriptions.setItem(id, item, noopCallback);
  }
};

// This function is called when all subscriptions are loaded
var storeAllTrackedSubscriptions = function() {
  // Throw if used wrong
  if (!allStoredSubscriptionsAreLoaded)
    throw new Error('Cannot store tracked subscriptions, they aren`t loaded yet');

  // Iterate over tracked subscriptions
  _.each(trackSubscriptions, function(item, id) {
    // Store the item
    storeItem(id, {
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      count: item.count,
    });
  });
};

var _createSubscription = function(arguments) {
  // Convert arguments to array
  for (var i=0, args = []; i < arguments.length;i++) args.push(arguments[i]);

  // Last argument helper
  var lastArg = args[args.length-1];

  // Unify the last argument if a callback
  if (typeof lastArg == 'function') lastArg = { onReady: lastArg };

  // Check if last argument is callback, callback object
  if (typeof lastArg == 'object' && typeof ( lastArg.onError || lastArg.onReady ) == 'function' ) {
    // XXX: We could have some extra ground subscription settings here
    // could be expireAt etc.
    // TODO: Figure out if we need to intercept the callbacks from the user
  }

  // Create identifier for subscription
  var _id = JSON.stringify(args);

  // Get subscription
  var sub = trackSubscriptions[_id] = trackSubscriptions[_id] || { createdAt: new Date(), count: 0};

  // Check if subscription handle not found, create handle
  if (!sub.handle) sub.handle = Meteor.subscribe.apply(Meteor.subscribe, args);

  // Set the updated at date
  sub.updatedAt = new Date();

  // Increase the usage counter
  sub.count++;

  // Store the sub in storage
  // XXX: I fear that this could
  storeItem(_id, {
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    count: sub.count,
    // handle isnt stored
  });

  return sub;
};

Ground.subscribe = function(/* arguments, callbacks */) {
  // create the subscription or get the existing handle
  var sub = _createSubscription(args);

  return {
    stop: function() {
      // NOOP
    },
    ready: function() {
      return sub.handle.ready();
    },
  };
};

// Weight by importance
var weight = {
  age: 1,
  lastUsed: 1,
  count: 2      // Most used should have a bigger chance
};

var sortByWeight = function(a, b) {
  // a.createdAt  Age of subscriptions in ms
  // a.updatedAt  Time since last activity
  // a.count      Count of times its been used

  // Weight
  var weightA = weight.age * (a.createdAt < b.createdAt) +      // oldest win
                weight.lastUsed * (a.updatedAt > b.updatedAt) + // newest win
                weight.count * (a.count > b.count);             // largest win

  var weightB = weight.age * (b.createdAt < a.createdAt) +
                weight.lastUsed * (b.updatedAt > a.updatedAt) +
                weight.count * (b.count > a.count);

  if (weightA > weightB) return -1; // a is less

  if (weightA < weightB) return 1; // b is less

  return 0; // Equal
};

Meteor.startup(function() {
  // Ok we are loaded - we actually want to throttle the resume subscriptions
  // and we want to load the important ones first - eg. last updated, most used
  // We also have to check if user already recreated a subscription
  storedSubscriptions.toObject(function(err, obj) {
    if (err) {
      console.warn('Ground subscriptions could not resume, Error: ' + err.message);
    } else {
      var loadSubscriptions = [];

      _.each(obj, function(val, key) {
        // Set the id
        val.id = key;
        // Add the val to list
        loadSubscriptions.push(val);
      });

      // Sort the loadSubscriptions
      // This is the algorithm for prioritizing the load order of subscriptions
      // XXX: We could at some point allow the user alter "weight"
      loadSubscriptions.sort(sortByWeight);

      // Trigger the load...
      var loader = Meteor.setInterval(function() {
        if (loadSubscriptions.length) {
          // We shift to get the first in line...
          var sub = loadSubscriptions.shift();
          // check if subscription is already loaded by user
          // if so we update the createdAt and increase the count
          if (trackSubscriptions[sub.id]) {

            // Increase the count
            trackSubscriptions[sub.id].count += sub.count;

            // Set the createdAt
            trackSubscriptions[sub.id].createdAt = sub.createdAt;
          } else {

            try {

              // Its not loaded already
              var args = JSON.parse(sub.id);

              // Rig the subscription
              trackSubscriptions[sub.id] = {
                createdAt: sub.createdAt,
                updatedAt: sub.updatedAt,
                count: sub.count,
                handle: Meteor.subscribe.apply(Meteor.subscribe, args);
              };

            } catch(err) {
              console.warn('Could not resume "Meteor.subscribe(' + sub.id + ')"');
            }

          }

        } else {
          // Stop the loader
          Meteor.clearInterval(loader);

          // Set all stored subscriptions loaded
          allStoredSubscriptionsAreLoaded = true;

          // Store all the tracked subscriptions
          storeAllTrackedSubscriptions();
        }
      }, 200);
    }
  });
});
