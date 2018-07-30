import { A } from '@ember/array';
import Controller from '@ember/controller';
import { htmlSafe } from '@ember/string';
import EmberObject, { computed } from '@ember/object';
import move from 'ember-animated/motions/move';

let Item = EmberObject.extend({
  style: computed('x', 'y', function() {
    return htmlSafe(`top: ${parseFloat(this.get('y'))}px; left: ${parseFloat(this.get('x'))}px; `);
  })
});

export default Controller.extend({
  transition: function * ({ keptSprites }) {
    keptSprites.forEach(move);
  },

  items: computed(function() {
    let items = A();
    items.push(Item.create({ id: 1, x: 200, y: 0 }));
    return items;
  }),
  actions: {
    go() {
      this.get('items').forEach(i => {
        let target = 200;
        if (i.get('x') === 200) {
          target = 100;
        }
        i.set('x', target);
        // i.set('y', 0);
      });
    },
    changeScale(scaleValue) {
      let el = document.getElementsByClassName('scenario-direct-style')[0];
      el.style['transform-origin'] = '0px 0px';
      el.style.transform = `scale(${scaleValue})`;
    }
  }
});

function somewhere() {
  return Math.random() * 300;
}
