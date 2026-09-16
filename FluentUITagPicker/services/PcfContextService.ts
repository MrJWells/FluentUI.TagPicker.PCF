import { IInputs } from '../generated/ManifestTypes'

//https://www.inogic.com/blog/2020/12/get-subgrid-information-from-the-pcf-context/

export interface IPcfContextServiceProps{
  context: ComponentFramework.Context<IInputs>
  instanceid: string
  isDarkMode: boolean
  notifyRelationshipChange: () => void
}

export interface iTagInfo{
  id: string
  name: string
}

const normalizeParentFilterToken = (value:string | null | undefined): string => {
  const normalized = (value ?? '').trim()
  if (!normalized) {
    return ''
  }

  return normalized.replace(/^[\s"'[{(]+|[\s"'[\]})]+$/g, '').trim()
}

export const parseParentFilterValues = (value:string | null | undefined): string[] => {
  const normalized = (value ?? '').trim()
  if (!normalized) {
    return []
  }

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      const parsed = JSON.parse(normalized)
      if (Array.isArray(parsed)) {
        return Array.from(new Set(
          parsed
            .filter(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
            .map(item => normalizeParentFilterToken(String(item)))
            .filter(item => item !== '')
        ))
      }
    } catch {
      // Fall back to delimiter parsing below.
    }
  }

  if (normalized.includes(',') || normalized.includes(';')) {
    return Array.from(new Set(
      normalized
        .split(/[;,]/)
        .map(item => normalizeParentFilterToken(item))
        .filter(item => item !== '')
    ))
  }

  const singleValue = normalizeParentFilterToken(normalized)
  return singleValue ? [singleValue] : []
}

export const getParentFilterValueSignature = (values:string[]): string => {
  return [...new Set(values.map(value => normalizeParentFilterToken(value)).filter(value => value !== ''))]
    .sort()
    .join('|')
}

export class PcfContextService {
  instanceid:string
  dataset : ComponentFramework.PropertyTypes.DataSet
  context: ComponentFramework.Context<IInputs>
  targetEntityName: string
  targetEntityId: string
  relatedEntityName : string
  relationshipName : string
  viewid : string
  showRecordImage:boolean
  isDisabled:boolean
  parentFilterValues:string[]
  parentFilterAttribute:string
  isParentFilteringConfigured:boolean
  hasParentFilterValues:boolean
  notifyRelationshipChange: () => void
  
  

  constructor (props?:IPcfContextServiceProps) {
    if (props) {
      this.instanceid = props.instanceid
      this.dataset = props.context.parameters.tagsDataSet
      this.context = props.context
      this.targetEntityName = (this.context.mode as any).contextInfo.entityTypeName
      this.targetEntityId   = (this.context.mode as any).contextInfo.entityId
      this.isDisabled   = (this.context.mode as any).contextInfo.entityId === undefined || this.context.mode.isControlDisabled
      this.relatedEntityName = props.context.parameters.tagsDataSet.getTargetEntityType()
      this.relationshipName = (this.context as any).navigation._customControlProperties.descriptor.Parameters.RelationshipName
      this.viewid = (this.context as any).navigation._customControlProperties.descriptor.Parameters.ViewId
      this.showRecordImage = props.context.parameters.showRecordImage.raw === 'true'
      this.parentFilterAttribute = this.normalizeParentFilterAttribute((props.context.parameters as any).parentFilterAttribute?.raw)
      this.parentFilterValues = parseParentFilterValues((props.context.parameters as any).parentFilterValue?.raw)
      this.isParentFilteringConfigured = this.parentFilterAttribute !== ''
      this.hasParentFilterValues = this.parentFilterValues.length > 0
      this.notifyRelationshipChange = props.notifyRelationshipChange
    }
  }

  private normalizeParentFilterAttribute (attribute:string | null | undefined) : string {
    const normalized = (attribute ?? '').trim()
    if (!normalized) {
      return ''
    }

    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized) ? normalized : ''
  }

  async getEntityMetadata (entityname:string) : Promise<ComponentFramework.PropertyHelper.EntityMetadata> {
    return this.context.utils.getEntityMetadata(entityname)
  }

  async getRecordImage (entityType:string, id:string, primaryimage:string) : Promise<string> {

    const record = await this.context.webAPI.retrieveRecord(entityType,id,`?$select=${primaryimage}`)
    return  record?.[primaryimage]
            ? `data:image/jpeg;base64,${record?.[primaryimage]}`
            : ''
  }

  async getDatasetView () : Promise<ComponentFramework.WebApi.Entity> {
    return await this.context.webAPI
      .retrieveRecord('savedquery', this.viewid, '?$select=returnedtypecode,fetchxml')
  }


  async getDatsetViewRecords (entityname:string, primaryid:string, primaryname:string, primaryimage:string, fetchxml:string, metadata:ComponentFramework.PropertyHelper.EntityMetadata) : Promise<ComponentFramework.WebApi.Entity[]> {
    if (this.isParentFilteringConfigured && !this.hasParentFilterValues) {
      return []
    }

    const parser = new DOMParser()
    const fetchxmldoc = parser.parseFromString(fetchxml, 'text/xml')

    // Manipulate fetch xml to include only the fields we need
    const entityelement = fetchxmldoc.getElementsByTagName('entity')[0]

    // remove existing attributes from view fetchxml
    fetchxmldoc.querySelectorAll('attribute').forEach(el => el.remove())
    fetchxmldoc.querySelectorAll('link-entity[alias="dependent"]').forEach(el => el.remove())

    const attributes:string[] = [primaryid, primaryname] // primaryid and primaryname is always fetched

    // add primaryimage if needed
    if (this.showRecordImage) {
      attributes.push(primaryimage)
    }


    // add attributes to fetchxml
    attributes.forEach(attribute => {
      const customattribute = fetchxmldoc.createElement('attribute')
      customattribute.setAttribute('name', attribute)
      entityelement.appendChild(customattribute)
    })

    if (this.isParentFilteringConfigured && this.hasParentFilterValues) {
      const customfilter = fetchxmldoc.createElement('filter')
      customfilter.setAttribute('type', 'and')

      if (this.parentFilterValues.length === 1) {
        const condition = fetchxmldoc.createElement('condition')
        condition.setAttribute('attribute', this.parentFilterAttribute)
        condition.setAttribute('operator', 'eq')
        condition.setAttribute('value', this.parentFilterValues[0])
        customfilter.appendChild(condition)
      } else {
        const anyParentFilter = fetchxmldoc.createElement('filter')
        anyParentFilter.setAttribute('type', 'or')

        this.parentFilterValues.forEach(value => {
          const condition = fetchxmldoc.createElement('condition')
          condition.setAttribute('attribute', this.parentFilterAttribute)
          condition.setAttribute('operator', 'eq')
          condition.setAttribute('value', value)
          anyParentFilter.appendChild(condition)
        })

        customfilter.appendChild(anyParentFilter)
      }

      entityelement.appendChild(customfilter)
    }

    
    const fetchxmlstring = new XMLSerializer().serializeToString(fetchxmldoc)
    const result = await this.context.webAPI
      .retrieveMultipleRecords(entityname, `?fetchXml=${fetchxmlstring}`)

    
    return result.entities;

  }

  getRecordText (record:ComponentFramework.WebApi.Entity, primaryname:string):string {

      return record[`${primaryname}`]

  }

  async associateRecord (targetEntity:string, targetEntityId:string, relatedEntity:string, relatedEntityId:string, relationshipName:string):Promise<void> {
    const associateRequest = {
      target: { entityType: targetEntity, id: targetEntityId },
      relatedEntities: [
          { entityType: relatedEntity, id: relatedEntityId }
      ],
      relationship: relationshipName,
      getMetadata: function () { return { boundParameter: null, parameterTypes: {}, operationType: 2, operationName: "Associate" }; }
    };

    const response = await (this.context.webAPI as any).execute(associateRequest)
    return response
  }

  async disAssociateRecord (targetEntity:string, targetEntityId:string, relatedEntityId:string, relationshipName:string):Promise<void> {
    const disassociateRequest = {
      target: { entityType: targetEntity, id: targetEntityId },
      relatedEntityId : relatedEntityId,
      relationship: relationshipName,
      getMetadata: function () { return { boundParameter: null, parameterTypes: {}, operationType: 2, operationName: "Disassociate" }; }
    };

    const response = await (this.context.webAPI as any).execute(disassociateRequest)
    return response
  }
}
