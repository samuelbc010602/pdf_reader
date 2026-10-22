import './toolbar.css'

function Toolbar(){
    function options(){
        return (
            <div>
                <button class="toolbar_button">Files</button> 
                <button class="toolbar_button">Edit</button> 
                <button class="toolbar_button">View</button>
                <button class="toolbar_button">Signature</button> 
                <button class="toolbar_button">Share</button> 
                <button class="toolbar_button">Export</button>
            </div>
        )
    }
    return options()
}
export default Toolbar