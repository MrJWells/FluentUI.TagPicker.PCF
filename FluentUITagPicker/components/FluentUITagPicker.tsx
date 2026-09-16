/* eslint no-async-promise-executor: 0 */  // --> OFF

import * as React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { usePcfContext } from '../services/PcfContext'
import { Image, Spinner, Tag, TagPicker, TagPickerControl, TagPickerGroup, TagPickerInput, TagPickerList, TagPickerOption, TagPickerProps, useTagPickerFilter } from '@fluentui/react-components'
import { ChevronDown20Regular, DismissFilled } from '@fluentui/react-icons';
import { useStyles } from '../styles/Styles'
import { useTagPickerOptions } from '../hooks/useRecords';

interface AssociateDisassociateResult {
    success: boolean;
    recordId: string;
    action: AssociateDisassociateAction;
    error?: any;
}

enum AssociateDisassociateAction {
    associate = 1,
    disassociate = 2,
}

const FluentUITagPicker = (): React.JSX.Element => {
    const pcfcontext = usePcfContext()
    const { options, status, isFetching } = useTagPickerOptions()
    const [query, setQuery] = useState<string>("");
    const [selectedOptions, setSelectedOptions] = React.useState<string[]>(pcfcontext.context.parameters.tagsDataSet.sortedRecordIds);
    const [commitedOptions, setComitedOptions] = React.useState<string[]>(pcfcontext.context.parameters.tagsDataSet.sortedRecordIds);
    const [isFocused, setIsFocused] = useState(false);
    const styles = useStyles();
    const isParentFilteringConfigured = pcfcontext.isParentFilteringConfigured;
    const hasParentFilterValues = pcfcontext.hasParentFilterValues;
    const isBlockedByParentFilter = isParentFilteringConfigured && !hasParentFilterValues;
    const isPickerDisabled = pcfcontext.isDisabled || isBlockedByParentFilter;


    const placeholder = useMemo(
        () => {
            if (isBlockedByParentFilter) {
                return pcfcontext.context.resources.getString('Select a parent category first') || 'Select a parent category first'
            }

            return selectedOptions.length === 0 ? '---' : ''
        },
        [isBlockedByParentFilter, selectedOptions]
    );

    const handleBlur = () => {
        setQuery('')
    };

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value)
    };

    const onOptionSelect: TagPickerProps["onOptionSelect"] = (e, data) => {
        if (isBlockedByParentFilter) {
            return
        }

        if (data.value === 'no-matches') {
            setQuery('')
            return
        }
        setSelectedOptions(data.selectedOptions)
        setQuery('')
    };

    useEffect(() => {
        if (!isParentFilteringConfigured) {
            return
        }

        if (!hasParentFilterValues) {
            if (selectedOptions.length > 0) {
                setSelectedOptions([])
            }
            if (commitedOptions.length > 0) {
                setComitedOptions([])
            }
            setQuery('')
            return
        }

        if (status !== 'success' || isFetching) {
            return
        }

        const validOptionIds = new Set(options.map((option) => option.id))
        const nextSelectedOptions = selectedOptions.filter(option => validOptionIds.has(option))
        const nextCommitedOptions = commitedOptions.filter(option => validOptionIds.has(option))

        if (nextSelectedOptions.length !== selectedOptions.length) {
            setSelectedOptions(nextSelectedOptions)
        }
        if (nextCommitedOptions.length !== commitedOptions.length) {
            setComitedOptions(nextCommitedOptions)
        }
    }, [isParentFilteringConfigured, hasParentFilterValues, status, isFetching, options, selectedOptions, commitedOptions])

    useEffect(
        () => {
            const associateDisassociateRecords = async (): Promise<any> => {
                if (selectedOptions !== commitedOptions) {
                    const actions: Promise<AssociateDisassociateResult>[] = [];
                    const optionsToAssociate = selectedOptions.filter(option => !commitedOptions.includes(option));

                    const associateActions = optionsToAssociate.map<Promise<AssociateDisassociateResult>>(option => {
                        return new Promise<AssociateDisassociateResult>(async (resolve, reject) => {
                            try {
                                await pcfcontext.associateRecord(pcfcontext.targetEntityName, pcfcontext.targetEntityId!, pcfcontext.relatedEntityName, option, pcfcontext.relationshipName)

                                resolve({
                                    action: AssociateDisassociateAction.associate,
                                    recordId: option,
                                    success: true,
                                } as AssociateDisassociateResult);
                            }
                            catch (e) {
                                resolve({
                                    action: AssociateDisassociateAction.associate,
                                    recordId: option,
                                    success: false,
                                    error: e,
                                } as AssociateDisassociateResult);
                            }
                        });
                    });

                    associateActions.forEach(action => actions.push(action));

                    const optionsToDisassociate = commitedOptions.filter(option => !selectedOptions.includes(option));
                    const disassociateActions = optionsToDisassociate.map<Promise<AssociateDisassociateResult>>(option => {
                        return new Promise(async (resolve, reject) => {
                            try {
                                await pcfcontext.disAssociateRecord(pcfcontext.targetEntityName, pcfcontext.targetEntityId!, option, pcfcontext.relationshipName)

                                resolve({
                                    action: AssociateDisassociateAction.disassociate,
                                    recordId: option,
                                    success: true,
                                } as AssociateDisassociateResult);
                            }
                            catch (e) {
                                resolve({
                                    action: AssociateDisassociateAction.disassociate,
                                    recordId: option,
                                    success: false,
                                    error: e,
                                } as AssociateDisassociateResult);
                            }
                        });
                    });

                    disassociateActions.forEach(action => actions.push(action));

                    const results = await Promise.all(actions);
                    const hasSuccessfulChanges = results.some(result => result.success);

                    const errors = results.filter(x => !x.success);
                    if (errors.length > 0) {
                        let viableOptions = [...selectedOptions];
                        const associateErrors = errors.filter(x => x.action === AssociateDisassociateAction.associate);

                        const disassociateErrors = errors.filter(x => x.action === AssociateDisassociateAction.disassociate)


                        let errorMessage = "";
                        if (associateErrors.length > 0) {
                            const errorString = associateErrors.map(result => {
                                console.error(result.error);
                                viableOptions = viableOptions.filter(x => x !== result.recordId); // Remove the item from the selected options
                                const associateRecord = options.find(x => x.id == result.recordId);
                                return `${associateRecord?.displaytext}: ${result.error?.message}`;
                            }).join(`
                            `);

                            errorMessage = `${pcfcontext.context.resources.getString('There was an error adding the following record:') || 'There was an error adding the following record:'} 
                            ${errorString}`;
                        }

                        if (disassociateErrors.length > 0) {
                            const errorString = disassociateErrors.map(result => {
                                console.error(result.error);
                                viableOptions.push(result.recordId); // Push the item back into the selected options.
                                const associateRecord = options.find(x => x.id == result.recordId);
                                return `${associateRecord?.displaytext}: ${result.error?.message}`;
                            }).join(`
                            `);

                            if (errorMessage !== "") {
                                errorMessage += `
                                `;
                            }

                            errorMessage += `${pcfcontext.context.resources.getString('There was an error removing the following record:') || 'There was an error removing the following record:'} 
                            ${errorString}`;
                        }

                        const alertStrings = {  text: errorMessage };
                        Xrm.Navigation.openAlertDialog(alertStrings);

                        setSelectedOptions(viableOptions);
                        setComitedOptions(viableOptions);
                    }
                    else {
                        setComitedOptions(selectedOptions)
                    }

                    if (hasSuccessfulChanges) {
                        pcfcontext.notifyRelationshipChange()
                    }
                }
            };

            associateDisassociateRecords()
                .catch(console.error);
        }
        , [selectedOptions])

    const children = useTagPickerFilter({
        query,
        options: options.map((option) => option.id),
        noOptionsElement: (
            <>
                {query.length > 0 &&
                    <TagPickerOption value="no-matches">
                        {pcfcontext.context.resources.getString('**no match**') || '**no match**'}
                    </TagPickerOption>}
            </>

        ),
        renderOption: (optionidToRender) => (
            <TagPickerOption
                className={styles.tagPickerOption}
                media={
                    options.find((option) => option.id === optionidToRender)?.imagesrc &&
                    <Image
                        className={styles.tagPickerOption}
                        alt={options.find((option) => option.id === optionidToRender)?.displaytext}
                        key={options.find((option) => option.id === optionidToRender)?.id}
                        shape="square"
                        src={options.find((option) => option.id === optionidToRender)?.imagesrc}
                        height={24}
                    //width={25}
                    />
                }
                text={options.find((option) => option.id === optionidToRender)?.displaytext ?? ''}
                value={optionidToRender}
                key={optionidToRender}
            >
                {options.find((option) => option.id === optionidToRender)?.displaytext}
            </TagPickerOption>
        ),

        filter: (option) =>
            !selectedOptions.includes(option) &&
            (options.find((o) => o.id === option)?.displaytext.toLowerCase().includes(query.toLowerCase()) ?? false)
    });

    // MAIN RENDERING
    if (status === 'pending' || isFetching) {
        return <Spinner size='tiny' appearance='primary' label={pcfcontext.context.resources.getString('Loading...') || 'Loading...'} />
    } if (status === 'error') {
        return <div>{pcfcontext.context.resources.getString('Error fetching data...') || 'Error fetching data...'}</div>
    } else {
        return (
            <div className={styles.tagPickerContainer}>
                {options && (
                    <TagPicker
                        onOptionSelect={onOptionSelect}
                        selectedOptions={selectedOptions}
                        appearance={'filled-darker'}
                        disabled={isPickerDisabled}
                    >
                        <TagPickerControl
                            className={styles.tagPickerControl}
                            onMouseEnter={() => { setIsFocused(true) }}
                            onMouseLeave={() => { setIsFocused(false) }}
                            expandIcon={<ChevronDown20Regular className={isFocused ? styles.elementVisible : styles.elementHidden} />}
                        >

                            <TagPickerGroup
                                className={styles.tagPickerGroup}
                            >
                                {selectedOptions.map((optionToRender) => (
                                    <Tag
                                        key={optionToRender}
                                        shape={'rounded'}
                                        size={'medium'}
                                        appearance={'brand'} // todo parametrize
                                        dismissIcon={<DismissFilled className={styles.icon12} />}
                                        media={
                                            options.find((option) => option.id === optionToRender)?.imagesrc &&
                                            <Image
                                                alt={options.find((option) => option.id === optionToRender)?.displaytext}
                                                key={options.find((option) => option.id === optionToRender)?.id}
                                                shape="square"
                                                src={options.find((option) => option.id === optionToRender)?.imagesrc}
                                                height={24}
                                            />

                                        }
                                        value={optionToRender}
                                        title={options.find((option) => option.id === optionToRender)?.displaytext}
                                        primaryText={{ className: styles.tagOverflow }}
                                    >
                                        {options.find((option) => option.id === optionToRender)?.displaytext}
                                    </Tag>
                                ))}

                            </TagPickerGroup>


                            <TagPickerInput
                                className={styles.tagPickerInput}
                                //aria-label={pcfcontext.SelectText()}
                                placeholder={placeholder}
                                value={query}
                                onChange={handleOnChange}
                                onBlur={handleBlur}
                                clearable={true}
                            />
                        </TagPickerControl>
                        <TagPickerList>
                            {children}
                        </TagPickerList>
                    </TagPicker>
                )}
                {isBlockedByParentFilter && (
                    <div>{pcfcontext.context.resources.getString('Select a parent category first') || 'Select a parent category first'}</div>
                )}
            </div>
        )
    }
}

export default FluentUITagPicker