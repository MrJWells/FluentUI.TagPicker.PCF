import { useQuery } from '@tanstack/react-query'

import { usePcfContext } from '../services/PcfContext'
import { useDatasetView } from './useDatasetView'
import { useMetadata } from './useMetadata'




export const useRecords = () => {
  const pcfcontext = usePcfContext()
  const { entityname, fetchxml } = useDatasetView()
  const { primaryid, primaryname, primaryimage, metadata } = useMetadata(entityname)
  const shouldFetchRecords = !pcfcontext.isParentFilteringConfigured || pcfcontext.hasParentFilterValues

  const { data, status, error, isFetching } =
    useQuery<ComponentFramework.WebApi.Entity[], Error>(
      {
        queryKey: ['datasetviewrecords', pcfcontext.instanceid, pcfcontext.viewid, pcfcontext.parentFilterAttribute, ...pcfcontext.parentFilterValues],
        queryFn: () => pcfcontext.getDatsetViewRecords(entityname, primaryid, primaryname, primaryimage, fetchxml, metadata!),
        enabled: !!entityname && !!primaryid && !!fetchxml && shouldFetchRecords,
        staleTime: Infinity
      }
    )

  return { records: data, status,
    error,
    isFetching }
}


export interface IRecord {
  id: string;
  primaryname?: string;
  displaytext: string;
  imagesrc?: string;
}

export const useTagPickerOptions = () => {
  const pcfcontext = usePcfContext()
  const { records, status, error, isFetching } = useRecords()
  const { entityname } = useDatasetView()
  const { primaryid, primaryname, primaryimage } = useMetadata(entityname)

  const options:IRecord[] = records ? records?.map(e => {
        const imagesrc = e?.[primaryimage] == null
          ? undefined
          : `data:image/jpeg;base64,${e?.[primaryimage]}`
        return {
          id: e[`${primaryid}`],
          primaryname: e[`${primaryname}`],
          displaytext: pcfcontext.getRecordText(e, primaryname),
          imagesrc: imagesrc
        }
      }) : []

  return { options, status, error, isFetching }
}
