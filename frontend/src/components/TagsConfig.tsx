import { useEffect, useState } from 'react'

import { AppConfig } from '@/appConfig'
import Tag from '@/components/Tag'
import TagConfigModal, { TagConfigModalData } from '@/components/modals/TagConfigModal'
import { getColorForTag, LSKEY_TAG_COLORS } from '@/lib/sner/tags'

const TagsConfig = () => {
    const [tags, setTags] = useState<AppConfig['tags']['colors']>({})
    const [addTag, setAddTag] = useState<string>('')
    const [tagConfigModal, setTagConfigModal] = useState<TagConfigModalData>({tag: '', color: '', show: false})

    useEffect(() => {
        const colorsConfig = JSON.parse(localStorage.getItem(LSKEY_TAG_COLORS)!) as AppConfig['tags']['colors']
        setTags(colorsConfig)
    }, [])

    const handleAdd = () => {
        setTags(prevConfig => {
            const colorsConfig = {...prevConfig, [addTag]: getColorForTag(addTag)};
            localStorage.setItem(LSKEY_TAG_COLORS, JSON.stringify(colorsConfig))
            return colorsConfig;
        })
        setAddTag('')
    }

    const handleDelete = (tag: string) => {
        setTags(prevConfig => {
            const colorsConfig = { ...prevConfig };
            delete colorsConfig[tag];
            localStorage.setItem(LSKEY_TAG_COLORS, JSON.stringify(colorsConfig))
            return colorsConfig;
        })
    }

    return (
        <div className="container">
            <div className="row my-2 align-items-center">
                <div className="form-inline">
                    <input
                        className="form-control form-control-sm mr-2"
                        placeholder="add tag"
                        value={addTag}
                        onChange={(e) => setAddTag(e.target.value)}
                    />
                    <i
                        className="fas fa-plus text-success"
                        role="button"
                        onClick={() => {addTag.trim() && handleAdd()}}
                        data-testid="newtag-btn"
                    ></i>
                </div>
            </div>
            {Object.keys(tags).map((item: string) => (
                <div key={item} className="row my-2 align-items-center">
                    <span
                        role="button"
                        title="Edit color"
                        onClick={() => setTagConfigModal({ tag: item, color: getColorForTag(item), show: true })}
                    >
                        <Tag tag={item} />
                    </span>
                    <i
                        className="fas fa-trash mx-2 text-danger"
                        role="button"
                        title="Delete color"
                        onClick={() => handleDelete(item)}
                    ></i>
                </div>
            ))}
            <TagConfigModal modalData={tagConfigModal} setModalData={setTagConfigModal} />
        </div>
    );
};

export default TagsConfig;
