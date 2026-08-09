import { claudeAdapter } from '../providers/claude/adapter'
import { watchProvider } from './watchProvider'

watchProvider(claudeAdapter)
