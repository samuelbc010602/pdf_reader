import { useEffect, useEffectEvent, useReducer, useState } from 'react'
import './toolbar.css'

const documentSettings = {
    type:"docx",
    pages:1,
    collabs:1,
    saved:false
}

function changeDocumentState (state,action){
    switch (action.type){
        case "add_pages":
            return {
                ...state,
                pages: state.pages+1
            };
        case "add_collabs":
            return {
                ...state,
                collabs: state.collabs+1
            };
        default:
            return state;
        }
    }

export default function Toolbar(){
    

    
    const [state,dispatch] = useReducer(changeDocumentState,documentSettings);
    return (
        <div>
            <button className = 'toolbar_button'>Files</button>
            <button className = 'toolbar_button'>View</button>
            <button className = 'toolbar_button'>Edit</button>
            <button className = 'toolbar_button'>Profile</button>
        </div>
    )

   }





