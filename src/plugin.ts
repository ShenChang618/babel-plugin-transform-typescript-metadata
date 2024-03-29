import { PluginObj } from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';
import { parameterVisitor } from './parameter/parameterVisitor';
import { metadataVisitor } from './metadata/metadataVisitor';

export default declare(
  (api: any, options: any): PluginObj => {
    api.assertVersion(7);

    return {
      visitor: {
        Program(programPath) {
          /**
           * We need to traverse the program right here since
           * `@babel/preset-typescript` removes imports at this level.
           *
           * Since we need to convert some typings into **bindings**, used in
           * `Reflect.metadata` calls, we need to process them **before**
           * the typescript preset.
           */
          programPath.traverse({
            ClassDeclaration(path) {
              try {
                if (options.includes && options.includes.length > 0 && !programPath.get('body').some(item => item.node.type === 'ImportDeclaration' && options.includes.includes(item.node.source.value))) {
                  return;
                }
              } catch (error) {}
              for (const field of path.get('body').get('body')) {
                if (
                  field.type !== 'ClassMethod' &&
                  field.type !== 'ClassProperty'
                )
                  continue;

                parameterVisitor(path, field as any);
                metadataVisitor(path, field as any);
              }

              /**
               * We need to keep binding in order to let babel know where imports
               * are used as a Value (and not just as a type), so that
               * `babel-transform-typescript` do not strip the import.
               */
              (path.parentPath.scope as any).crawl();
            }
          });
        }
      }
    };
  }
);
