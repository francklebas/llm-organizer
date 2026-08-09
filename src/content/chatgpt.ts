import { chatgptAdapter } from '../providers/chatgpt/adapter'
import { watchProvider } from './watchProvider'

watchProvider(chatgptAdapter)
