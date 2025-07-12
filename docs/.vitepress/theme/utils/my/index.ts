import { useMyOptions  } from "../../config/blog";
import { onMounted } from 'vue'

export function useMyConfig (){
    const myConfig = useMyOptions()
    onMounted(async()=>{
        if(myConfig){
            console.log(myConfig.text)
        }
    })
}