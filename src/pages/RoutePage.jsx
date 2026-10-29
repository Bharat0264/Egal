import App from '../App'
import SimplePage from './SimplePage'
import LegalPage from './LegalPage'
import {SelectionProvider} from '../state/SelectionContext'
export default function RoutePage({path='/'}){
 if(path==='/simple')return <SelectionProvider><SimplePage/></SelectionProvider>
 if(['/privacy','/terms','/cancellation'].includes(path))return <LegalPage page={path.slice(1)}/>
 return <App/>
}
