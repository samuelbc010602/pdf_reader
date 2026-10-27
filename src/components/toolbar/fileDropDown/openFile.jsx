import { Field } from "@base-ui/react";




export default function OpenFile({ setUploadedFile, setFileName, setFileType }) {
    const input = document.createElement("input");

    input.type = "file";

    input.onchange = (event) => {
        const file = event.target.files[0];

        if (file) {
            const fileName = file.name;
            const fileType = fileName.split(".").pop().toLowerCase();

            setUploadedFile(file);
            setFileName(fileName);
            setFileType(fileType);

            console.log("this is the opened file",file);
        }
    };

    input.click();
}