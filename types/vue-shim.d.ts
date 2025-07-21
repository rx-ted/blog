import type Artalk, { ArtalkConfig } from 'artalk'

declare global {
  interface Window {
    Artalk: {
      init(options: Partial<ArtalkConfig>): Artalk
    }
  }
}

declare module '*.vue' {
  import type { ComponentOptions } from 'vue'

  const comp: ComponentOptions
  export default comp
}


declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, any>;
  export default component;
}

declare module '*.md' {
  import { ComponentOptions } from 'vue';
  const component: ComponentOptions;
  export default component;
}