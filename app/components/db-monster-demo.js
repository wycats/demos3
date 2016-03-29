import Ember from 'ember';
import getData from '../lib/get-data';

// let shouldProfile = window.location.search === '?profile';

class ExponentialMovingAverage {
  constructor(alpha) {
    this.alpha = alpha;
    this.lastValue = null;
  }

  value() {
    return this.lastValue;
  }

  push(dataPoint) {
    let { alpha, lastValue } = this;

    if (lastValue) {
      return this.lastValue = lastValue + alpha * (dataPoint - lastValue);
    } else {
      return this.lastValue = dataPoint;
    }
  }
}

export default Ember.Component.extend({

  init() {
    this._super();
    this.set('isPlaying', false);
    this.set('model', generateData());
    this.set('fps', null);

    // FIXME: we need the {{action}} helper working
    this.play = this.actions.play.bind(this);
    this.pause = this.actions.pause.bind(this);
    this.raf = null;
  },

  actions: {
    play() {
      this.set('isPlaying', true);

      let lastFrame = null;
      let fpsMeter = new ExponentialMovingAverage(2/121);

      let callback = () => {
        let thisFrame = window.performance.now();

        this.onFrame();

        if (lastFrame) {
          this.set('fps', Math.round(fpsMeter.push(1000 / (thisFrame - lastFrame))));
        }

        // console.time('rerender');
        // if (shouldProfile) { console.profile('rerender'); }
        this.rerender(); // FIXME: Glimmer 2 runloop integration
        // if (shouldProfile) { console.profileEnd('rerender'); }
        // console.timeEnd('rerender');
        this.raf = requestAnimationFrame(callback);

        lastFrame = thisFrame;
      };

      callback();

      lastFrame = null;
    },

    pause() {
      this.set('isPlaying', false);

      cancelAnimationFrame(this.raf);

      this.raf = null;

      this.rerender(); // FIXME: Glimmer 2 runloop integration
    }
  },

  onFrame() {
    this.set('model', generateData(this.model));
    // updateServers(this.servers);
  },

  willDestroyElement() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
  }

});

function generateData(oldData) {
  let rawData = getData();

  let databases = (oldData && oldData.databases) || {};
  let databaseArray = [];

  let data = { databases, databaseArray };

  Object.keys(rawData.databases).forEach(dbname => {
    let sampleInfo = rawData.databases[dbname];

    if (!databases[dbname]) {
      databases[dbname] = {
        name: dbname,
        samples: []
      };
    }

    let samples = databases[dbname].samples;

    samples.push({
      time: rawData.start_at,
      queries: sampleInfo.queries
    });

    if (samples.length > 5) {
      samples.splice(0, samples.length - 5);
    }

    databaseArray.push(databases[dbname]);
  });

  return data;
}
