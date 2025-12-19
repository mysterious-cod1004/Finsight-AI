import { currentUser } from "@clerk/nextjs/server"
import Guest from "@/components/Guest"
export default async function page() {
const user = await currentUser();
if(!user){
  return <Guest/>;
}
  return (
    <div className='bg-amber-600'>page</div>
  )
}
