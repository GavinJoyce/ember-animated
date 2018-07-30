import Controller from '@ember/controller';

export default Controller.extend({
  actions: {
    changeScale(scaleValue) {
      let el = document.getElementsByClassName('demos')[0];
      el.style['transform-origin'] = '0px 0px';
      el.style.transform = `scale(${scaleValue})`;
    }
  }
});
