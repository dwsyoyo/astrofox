import Display from 'core/Display';
import Effect from 'core/Effect';
import Composer from 'graphics/Composer';
import { remove, insert, swap } from 'utils/array';

export default class Scene extends Display {
  static label = 'Scene';

  static className = 'Scene';

  static defaultProperties = {
    blendMode: 'Normal',
    opacity: 1.0,
    mask: false,
    inverse: false,
    stencil: false,
  };

  constructor(properties) {
    super(Scene, properties);

    this.stage = null;
    this.displays = [];
    this.effects = [];
    this.reactors = {};

    Object.defineProperty(this, 'type', { value: 'scene' });
  }

  update(properties) {
    const changed = super.update(properties);
    const { stage } = this;

    if (changed && stage) {
      this.updatePasses();
    }

    return changed;
  }

  addToStage(stage) {
    this.stage = stage;

    this.composer = new Composer(stage.renderer);

    this.updatePasses();
  }

  removeFromStage() {
    this.stage = null;
    this.displays = null;
    this.effects = null;
    this.composer.dispose();
    this.composer = null;
  }

  getSize() {
    return this.composer.getSize();
  }

  setSize(width, height) {
    this.displays.forEach(display => {
      if (display.setSize) {
        display.setSize(width, height);
      }
    });

    this.effects.forEach(effect => {
      if (effect.setSize) {
        effect.setSize(width, height);
      }
    });

    this.composer.setSize(width, height);
  }

  getType(obj) {
    return obj instanceof Effect ? 'effects' : 'displays';
  }

  getElementById(id) {
    return this.displays.find(n => n.id === id) || this.effects.find(n => n.id === id);
  }

  hasElement(obj) {
    return !!this.getElementById(obj.id);
  }

  addElement(obj, index) {
    if (!obj) {
      return;
    }

    const type = this.getType(obj);

    if (index !== undefined) {
      insert(this[type], index, obj);
    } else {
      this[type].push(obj);
    }

    Object.defineProperty(obj, 'scene', { value: this });

    if (obj.addToScene) {
      obj.addToScene(this);
    }

    if (obj.setSize) {
      const { width, height } = this.stage.getSize();

      obj.setSize(width, height);
    }

    this.updatePasses();

    this.changed = true;

    return obj;
  }

  removeElement(obj) {
    if (!this.hasElement(obj)) {
      return false;
    }

    const type = this.getType(obj);

    remove(this[type], obj);

    obj.scene = null;

    if (obj.removeFromScene) {
      obj.removeFromScene(this);
    }

    this.updatePasses();

    this.changed = true;

    return true;
  }

  shiftElement(obj, i) {
    if (!this.hasElement(obj)) {
      return false;
    }

    const type = this.getType(obj);
    const index = this[type].indexOf(obj);

    swap(this[type], index, index + i);

    this.changed = this[type].indexOf(obj) !== index;

    if (this.changed) {
      this.updatePasses();
    }

    return this.changed;
  }

  updatePasses() {
    const {
      composer,
      displays,
      effects,
      stage: { canvasBuffer, webglBuffer },
    } = this;

    composer.clearPasses();
    composer.addPass(canvasBuffer.pass);
    composer.addPass(webglBuffer.pass);

    displays.forEach(display => {
      if (display.pass) {
        composer.addPass(display.pass);
      }
    });

    effects.forEach(effect => {
      if (effect.pass) {
        composer.addPass(effect.pass);
      }
    });
  }

  getCanvasConext() {
    return this.stage.canvasBuffer.context;
  }

  getRenderer() {
    return this.stage.webglBuffer.renderer;
  }

  hasChanges() {
    if (this.changed) {
      return true;
    }

    return !!this.displays.find(e => e.changed);
  }

  resetChanges() {
    this.changed = false;

    this.displays.forEach(display => {
      display.changed = false;
    });
  }

  toJSON() {
    const { id, name, properties, displays, effects, reactors } = this;

    return {
      id,
      name,
      properties: { ...properties },
      displays: displays.map(display => display.toJSON()),
      effects: effects.map(effect => effect.toJSON()),
      reactors,
    };
  }

  clear() {
    const {
      composer,
      stage: { canvasBuffer, webglBuffer },
    } = this;

    canvasBuffer.clear();
    webglBuffer.clear();
    composer.clearBuffer();
  }

  render(data) {
    const { composer, displays, effects } = this;

    this.clear();
    this.updateReactors(data);

    if (displays.length > 0 || effects.length > 0) {
      displays.forEach(display => {
        if (display.properties.enabled) {
          display.updateReactors(data);
          display.renderToScene(this, data);
        }
      });

      effects.forEach(effect => {
        if (effect.properties.enabled) {
          effect.updateReactors(data);
          effect.renderToScene(this, data);
        }
      });

      composer.render();
    }

    return composer.readBuffer;
  }
}