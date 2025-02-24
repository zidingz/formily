import React from 'react'
import { FormPath } from '@formily/core'
import { GlobalRegistry, TreeNode } from '@designable/core'
import { useDesigner, useTreeNode } from '@designable/react'
import {
  ArrayField,
  Field,
  ObjectField,
  VoidField,
  observer,
  Schema,
  ISchema,
} from '@formily/react'
import {
  DataSourceSetter,
  ReactionsSetter,
  ValidatorSetter,
} from '@formily/designable-setters'
import { FormTab, FormItem } from '@formily/antd'
import { isArr, isStr, each, reduce } from '@formily/shared'
import { FormItemSwitcher } from '../FormItemSwitcher'
import { DesignableObject } from '../DesignableObject'
import { createOptions } from './options'
import { IDesignableFieldFactoryProps } from './types'
import { includesComponent } from '../../shared'
import * as defaultSchemas from '../../schemas'

Schema.silent()

const SchemaStateMap = {
  title: 'title',
  description: 'description',
  default: 'value',
  enum: 'dataSource',
  readOnly: 'readOnly',
  writeOnly: 'editable',
  required: 'required',
  'x-content': 'content',
  'x-value': 'value',
  'x-editable': 'editable',
  'x-disabled': 'disabled',
  'x-read-pretty': 'readPretty',
  'x-read-only': 'readOnly',
  'x-visible': 'visible',
  'x-hidden': 'hidden',
  'x-display': 'display',
  'x-pattern': 'pattern',
}

const NeedShownExpression = {
  title: true,
  description: true,
  default: true,
  'x-content': true,
  'x-value': true,
}

const isExpression = (val: any) => isStr(val) && /^\{\{.*\}\}$/.test(val)

const filterExpression = (val: any) => {
  if (typeof val === 'object') {
    const isArray = isArr(val)
    const results = reduce(
      val,
      (buf: any, value, key) => {
        if (isExpression(value)) {
          return buf
        } else {
          const results = filterExpression(value)
          if (results === undefined || results === null) return buf
          if (isArray) {
            return buf.concat([results])
          }
          buf[key] = results
          return buf
        }
      },
      isArray ? [] : {}
    )
    return results
  }
  if (isExpression(val)) {
    return
  }
  return val
}

const toDesignableFieldProps = (
  schema: ISchema,
  components: any,
  nodeIdAttrName: string,
  id: string
) => {
  const results: any = {}
  each(SchemaStateMap, (fieldKey, schemaKey) => {
    const value = schema[schemaKey]
    if (isExpression(value)) {
      if (!NeedShownExpression[schemaKey]) return
      if (value) {
        results[fieldKey] = value
        return
      }
    } else if (value) {
      results[fieldKey] = filterExpression(value)
    }
  })
  if (!components['FormItem']) {
    components['FormItem'] = FormItem
  }
  const decorator =
    schema['x-decorator'] && FormPath.getIn(components, schema['x-decorator'])
  const component =
    schema['x-component'] && FormPath.getIn(components, schema['x-component'])
  const decoratorProps = schema['x-decorator-props'] || {}
  const componentProps = schema['x-component-props'] || {}

  if (decorator) {
    results.decorator = [decorator, { ...decoratorProps }]
  }
  if (component) {
    results.component = [component, { ...componentProps }]
  }
  if (decorator) {
    FormPath.setIn(results['decorator'][1], nodeIdAttrName, id)
  } else if (component) {
    FormPath.setIn(results['component'][1], nodeIdAttrName, id)
  }
  results.title = results.title && (
    <span data-content-editable="title">{results.title}</span>
  )
  results.description = results.description && (
    <span data-content-editable="description">{results.description}</span>
  )
  return results
}

export const createDesignableField = (
  options: IDesignableFieldFactoryProps
) => {
  const realOptions = createOptions(options)

  const tabs = {}

  const getFieldPropsSchema = (node: TreeNode): ISchema => {
    const decorator = node.props['x-decorator']
    const component = node.props['x-component']
    const decoratorSchema =
      decorator &&
      (FormPath.getIn(realOptions.componentsPropsSchema, decorator) ||
        FormPath.getIn(defaultSchemas, decorator))
    const componentSchema =
      component &&
      (FormPath.getIn(realOptions.componentsPropsSchema, component) ||
        FormPath.getIn(defaultSchemas, component))
    const TabSchema = (key: string, schema: ISchema) => {
      tabs[key] = tabs[key] || FormTab.createFormTab()
      return {
        type: 'object',
        properties: {
          propsTab: {
            type: 'void',
            'x-component': 'FormTab',
            'x-component-props': {
              formTab: tabs[key],
              style: {
                overflow: 'visible',
              },
            },
            properties: {
              propsPane: {
                type: 'void',
                'x-component': 'FormTab.TabPane',
                'x-component-props': {
                  tab: GlobalRegistry.getDesignerMessage(
                    `settings.${key}.tab_property`
                  ),
                },
                properties: schema.properties,
              },
              stylePane: {
                type: 'void',
                'x-component': 'FormTab.TabPane',
                'x-component-props': {
                  tab: GlobalRegistry.getDesignerMessage(
                    `settings.${key}.tab_style`
                  ),
                },
                properties: {
                  style: defaultSchemas.CSSStyle,
                },
              },
            },
          },
        },
      }
    }
    const base = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': {
            defaultValue: node.id,
          },
          'x-index': 0,
        },
        title: {
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-index': 1,
        },
        description: {
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input.TextArea',
          'x-index': 2,
        },
        'x-display': {
          type: 'string',
          enum: ['visible', 'hidden', 'none', ''],
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            defaultValue: 'visible',
          },
          'x-index': 3,
        },
        'x-pattern': {
          type: 'string',
          enum: ['editable', 'disabled', 'readOnly', 'readPretty', ''],
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            defaultValue: 'editable',
          },
          'x-index': 4,
        },
        'x-component-props':
          componentSchema && TabSchema('x-component-props', componentSchema),
        'x-decorator-props':
          decoratorSchema && TabSchema('x-decorator-props', decoratorSchema),
      },
    }

    if (node.props.type === 'void') {
      if (!includesComponent(node, realOptions.dropReactionComponents)) {
        Object.assign(base.properties, {
          'x-reactions': {
            'x-decorator': 'FormItem',
            'x-index': 5,
            'x-component': ReactionsSetter,
          },
        })
      }
      if (!includesComponent(node, realOptions.dropFormItemComponents)) {
        Object.assign(base.properties, {
          'x-decorator': {
            type: 'string',
            'x-decorator': 'FormItem',
            'x-component': FormItemSwitcher,
            'x-index': 10,
            'x-reactions': {
              target: '*(title,description)',
              fulfill: {
                state: {
                  hidden: '{{$self.value !== "FormItem"}}',
                },
              },
            },
          },
        })
      } else {
        delete base.properties.title
        delete base.properties.description
      }
    } else {
      if (!includesComponent(node, realOptions.dropReactionComponents)) {
        Object.assign(base.properties, {
          'x-reactions': {
            'x-decorator': 'FormItem',
            'x-index': 7,
            'x-component': ReactionsSetter,
          },
        })
      }
      Object.assign(base.properties, {
        default: {
          'x-decorator': 'FormItem',
          'x-component': 'ValueInput',
          'x-index': 5,
        },
        enum: {
          'x-decorator': 'FormItem',
          'x-component': DataSourceSetter,
          'x-index': 6,
        },
        'x-validator': {
          type: 'array',
          'x-component': ValidatorSetter,
          'x-index': 8,
        },
        required: {
          type: 'boolean',
          'x-decorator': 'FormItem',
          'x-component': 'Switch',
          'x-index': 9,
        },
      })
    }

    base['$namespace'] = `namespace.${component}`

    return base
  }

  const calculateChildrenRestricts = (target: TreeNode, source: TreeNode[]) => {
    const targetComponent = target.props['x-component']
    const restrictChildrenComponents =
      realOptions.restrictChildrenComponents?.[targetComponent]
    if (restrictChildrenComponents?.length) {
      if (
        source.every((node) =>
          includesComponent(node, restrictChildrenComponents, target)
        )
      ) {
        return true
      }
      return false
    }
    return true
  }

  const calculateSiblingsRestricts = (target: TreeNode, source: TreeNode[]) => {
    const targetComponent = target.props['x-component']
    const restrictSiblingComponents =
      realOptions.restrictSiblingComponents?.[targetComponent]
    if (restrictSiblingComponents?.length) {
      if (
        source.every((node) =>
          includesComponent(node, restrictSiblingComponents, target)
        )
      ) {
        return true
      }
      return false
    }
    return true
  }

  if (!realOptions.registryName) throw new Error('Can not found registryName')

  GlobalRegistry.registerDesignerProps({
    [realOptions.registryName]: (node) => {
      const componentName = node.props?.['x-component']
      const message = GlobalRegistry.getDesignerMessage(
        `components.${componentName}`
      )
      const isObjectNode = node.props.type === 'object'
      const isArrayNode = node.props.type === 'array'
      const isVoidNode = node.props.type === 'void'
      const title = typeof message === 'string' ? message : message?.title
      const nodeTitle =
        title ||
        (isObjectNode
          ? GlobalRegistry.getDesignerMessage('components.Object')
          : isVoidNode
          ? GlobalRegistry.getDesignerMessage('components.Void')
          : '')
      const sourceIcon = realOptions.componentsSourceIcon?.[componentName]
      return {
        title: nodeTitle,
        sourceIcon: isObjectNode ? 'ObjectSource' : sourceIcon,
        icon: realOptions.componentsIcon?.[componentName],
        draggable: true,
        droppable: isObjectNode || isArrayNode || isVoidNode,
        selfRenderChildren:
          isArrayNode ||
          includesComponent(node, realOptions.selfRenderChildrenComponents),
        inlineLayout: includesComponent(
          node,
          realOptions.inlineLayoutComponents
        ),
        inlineChildrenLayout: includesComponent(
          node,
          realOptions.inlineChildrenLayoutComponents
        ),
        allowSiblings(target, source) {
          return calculateSiblingsRestricts(target, source)
        },
        allowAppend(target, source) {
          return (
            (target.props.type === 'void' ||
              target.props.type === 'array' ||
              target.props.type === 'object') &&
            calculateChildrenRestricts(target, source)
          )
        },
        propsSchema: getFieldPropsSchema(node),
      }
    },
  })

  const DesignableField: React.FC<ISchema> = observer((props) => {
    const designer = useDesigner()
    const node = useTreeNode()
    if (!node) return null

    const fieldProps = toDesignableFieldProps(
      props,
      realOptions.components,
      designer.props.nodeIdAttrName,
      node.id
    )
    if (props.type === 'object') {
      return (
        <DesignableObject>
          <ObjectField {...fieldProps} name={node.id}>
            {props.children}
          </ObjectField>
        </DesignableObject>
      )
    } else if (props.type === 'array') {
      return <ArrayField {...fieldProps} name={node.id} />
    } else if (node.props.type === 'void') {
      return (
        <VoidField {...fieldProps} name={node.id}>
          {props.children}
        </VoidField>
      )
    }
    return <Field {...fieldProps} name={node.id} />
  })

  return DesignableField
}
