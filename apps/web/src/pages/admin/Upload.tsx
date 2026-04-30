import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Database, Shield } from 'lucide-react'

import type { GpkgValidationError, WorkgroupId } from '@napi-aguas/shared'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth.store'
import {
  fetchUploadStatus,
  uploadGpkgFile,
  uploadCsvFile,
  type UploadStatus,
} from '@/services/upload.service'

type Phase =
  | 'idle'
  | 'uploading-gpkg'
  | 'processing-gpkg'
  | 'uploading-csv'
  | 'completed'
  | 'failed'

const MAX_POLLING_ATTEMPTS = 60
const POLLING_INTERVAL_MS = 2000

const ALL_WORKGROUPS: WorkgroupId[] = ['agua-doce', 'saude', 'litoral', 'transportes']

const WORKGROUP_LABELS: Record<WorkgroupId, string> = {
  'agua-doce': 'Água Doce',
  saude: 'Saúde',
  litoral: 'Litoral',
  transportes: 'Transportes',
}

const WORKGROUP_DESCRIPTIONS: Record<WorkgroupId, string> = {
  'agua-doce': 'Subbacias de nível 10 com indicadores de vulnerabilidade aquática',
  saude: '399 municípios do Paraná com indicadores de exposição à saúde',
  litoral: '7 municípios litorâneos do Paraná com indicadores de vulnerabilidade costeira',
  transportes: 'Rodovias estaduais e federais do Paraná com indicadores de vulnerabilidade',
}

export function UploadPage() {
  const { accessToken, user } = useAuthStore()

  // Determina os GTs permitidos baseado no role do usuário
  const allowedWorkgroups = useMemo<WorkgroupId[]>(() => {
    if (!user) return []
    if (user.role === 'admin') return ALL_WORKGROUPS
    // gt_member só pode acessar seu próprio GT
    if (user.workgroupId && ALL_WORKGROUPS.includes(user.workgroupId as WorkgroupId)) {
      return [user.workgroupId as WorkgroupId]
    }
    return []
  }, [user])

  // Define o workgroup inicial baseado nas permissões do usuário
  const defaultWorkgroup = useMemo<WorkgroupId>(() => {
    if (allowedWorkgroups.length > 0) return allowedWorkgroups[0]
    return 'agua-doce'
  }, [allowedWorkgroups])

  const [selectedWorkgroup, setSelectedWorkgroup] = useState<WorkgroupId>(defaultWorkgroup)

  // Atualiza o workgroup selecionado quando as permissões mudam
  useEffect(() => {
    if (allowedWorkgroups.length > 0 && !allowedWorkgroups.includes(selectedWorkgroup)) {
      setSelectedWorkgroup(allowedWorkgroups[0])
    }
  }, [allowedWorkgroups, selectedWorkgroup])
  const [gpkgFile, setGpkgFile] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [backendStatus, setBackendStatus] = useState<UploadStatus | null>(null)
  const [gpkgProgress, setGpkgProgress] = useState(0)
  const [csvProgress, setCsvProgress] = useState(0)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<GpkgValidationError[]>([])
  const [statistics, setStatistics] = useState<{
    featuresCount: number
    indicatorsLoaded: number
  } | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingAttemptsRef = useRef(0)

  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [])

  const clearPolling = () => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const handleGpkgFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setGpkgFile(null)
      return
    }

    setGpkgFile(event.target.files[0])
    setError(null)
    setValidationErrors([])
    setStatistics(null)
  }

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setCsvFile(null)
      return
    }

    setCsvFile(event.target.files[0])
    setError(null)
    setValidationErrors([])
    setStatistics(null)
  }

  const startPolling = (
    id: string,
    token: string,
  ): Promise<{ featuresCount: number; indicatorsLoaded: number } | null> => {
    return new Promise((resolve, reject) => {
      clearPolling()
      pollingAttemptsRef.current = 0

      pollingRef.current = setInterval(async () => {
        pollingAttemptsRef.current += 1

        if (pollingAttemptsRef.current > MAX_POLLING_ATTEMPTS) {
          clearPolling()
          reject(new Error('Tempo limite excedido: processamento levou mais de 2 minutos.'))
          return
        }

        try {
          const statusResponse = await fetchUploadStatus(id, token)
          setBackendStatus(statusResponse.status)

          if (statusResponse.status === 'completed') {
            clearPolling()
            resolve(statusResponse.statistics ?? null)
          } else if (statusResponse.status === 'failed') {
            clearPolling()
            setValidationErrors(statusResponse.errors ?? [])
            reject(new Error('Validação do GPKG falhou. Verifique os erros acima.'))
          }
        } catch (pollError) {
          clearPolling()
          reject(
            pollError instanceof Error
              ? pollError
              : new Error('Erro ao consultar status do upload.'),
          )
        }
      }, POLLING_INTERVAL_MS)
    })
  }

  const handleUpload = async () => {
    if (!gpkgFile || !csvFile) {
      setError('Selecione ambos os arquivos (.gpkg e .csv) para continuar.')
      return
    }

    if (!accessToken) {
      setError('Sessão expirada. Faça login novamente.')
      return
    }

    // Carrega o conteúdo dos arquivos em memória antes de qualquer operação assíncrona
    // — o objeto File pode ser invalidado por re-renders ou pelo HMR do Vite.
    const workgroupRef = selectedWorkgroup
    const tokenRef = accessToken

    const [gpkgBuffer, csvBuffer] = await Promise.all([
      gpkgFile.arrayBuffer(),
      csvFile.arrayBuffer(),
    ])

    const gpkgFileRef = new File([gpkgBuffer], gpkgFile.name, {
      type: gpkgFile.type || 'application/geopackage+sqlite3',
    })
    const csvFileRef = new File([csvBuffer], csvFile.name, { type: csvFile.type || 'text/csv' })

    // Limpa estado anterior antes de iniciar novo upload
    clearPolling()
    setError(null)
    setValidationErrors([])
    setStatistics(null)
    setUploadId(null)
    setBackendStatus(null)
    setGpkgProgress(0)
    setCsvProgress(0)

    try {
      // Etapa 1: Upload do GPKG
      setPhase('uploading-gpkg')
      setGpkgProgress(0)

      const gpkgResponse = await uploadGpkgFile(
        gpkgFileRef,
        workgroupRef,
        tokenRef,
        setGpkgProgress,
      )
      setUploadId(gpkgResponse.upload_id)
      setBackendStatus(gpkgResponse.status)

      // Aguarda processamento do GPKG via polling
      setPhase('processing-gpkg')
      const gpkgStats = await startPolling(gpkgResponse.upload_id, tokenRef)

      // Etapa 2: Upload do CSV
      setPhase('uploading-csv')
      setCsvProgress(0)

      await uploadCsvFile(csvFileRef, workgroupRef, tokenRef, setCsvProgress)

      // Sucesso total
      setPhase('completed')
      setStatistics(gpkgStats)
    } catch (uploadError) {
      setPhase('failed')
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Falha inesperada ao enviar os arquivos.',
      )
    }
  }

  const handleReset = () => {
    clearPolling()
    setGpkgFile(null)
    setCsvFile(null)
    setUploadId(null)
    setGpkgProgress(0)
    setCsvProgress(0)
    setBackendStatus(null)
    setValidationErrors([])
    setStatistics(null)
    setError(null)
    setPhase('idle')
  }

  const isBusy =
    phase === 'uploading-gpkg' || phase === 'processing-gpkg' || phase === 'uploading-csv'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Upload de Dados – GT {WORKGROUP_LABELS[selectedWorkgroup]}
        </h2>
        <p className="text-gray-500 mt-2">
          Envie os arquivos GPKG (geoespacial) e CSV (tabular) para atualização de dados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Grupo de Trabalho e Arquivos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informação de permissões do usuário */}
          {user && (
            <Alert className={user.role === 'admin' ? 'border-purple-200 bg-purple-50' : 'border-amber-200 bg-amber-50'}>
              <Shield className={`h-4 w-4 ${user.role === 'admin' ? 'text-purple-600' : 'text-amber-600'}`} />
              <AlertDescription className={user.role === 'admin' ? 'text-purple-800' : 'text-amber-800'}>
                {user.role === 'admin' ? (
                  <>
                    <strong>Administrador:</strong> Você tem permissão para fazer upload em todos os Grupos de Trabalho.
                  </>
                ) : (
                  <>
                    <strong>Membro GT {user.workgroupId ? WORKGROUP_LABELS[user.workgroupId as WorkgroupId] : ''}:</strong> Você tem permissão para fazer upload apenas no GT {user.workgroupId ? WORKGROUP_LABELS[user.workgroupId as WorkgroupId] : 'vinculado à sua conta'}.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="workgroup-select" className="text-sm font-medium text-gray-900">
              Grupo de Trabalho
            </label>
            <Select
              value={selectedWorkgroup}
              onValueChange={(value) => setSelectedWorkgroup(value as WorkgroupId)}
              disabled={isBusy || allowedWorkgroups.length <= 1}
            >
              <SelectTrigger id="workgroup-select">
                <SelectValue placeholder="Selecione o GT" />
              </SelectTrigger>
              <SelectContent>
                {allowedWorkgroups.map((wg) => (
                  <SelectItem key={wg} value={wg}>
                    {WORKGROUP_LABELS[wg]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">{WORKGROUP_DESCRIPTIONS[selectedWorkgroup]}</p>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>Importante:</strong> É obrigatório enviar os dois arquivos (GPKG e CSV) para
              cada grupo de trabalho. Ambos os arquivos serão processados e disponibilizados para
              exportação.
            </AlertDescription>
          </Alert>

          {/* Upload GPKG */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-600" />
              Arquivo GPKG (GeoPackage - Dados Geoespaciais) <span className="text-red-500">*</span>
            </label>
            <label
              htmlFor="gpkg-upload"
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center cursor-pointer transition-colors ${
                gpkgFile
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-500'
              }`}
            >
              <Database className={`h-8 w-8 ${gpkgFile ? 'text-purple-600' : 'text-purple-500'}`} />
              <div>
                <p className="font-medium text-gray-900">
                  {gpkgFile ? gpkgFile.name : 'Clique para selecionar um arquivo .gpkg'}
                </p>
                <p className="text-sm text-gray-500">
                  Arquivo geoespacial com geometrias e indicadores
                </p>
              </div>
              <input
                id="gpkg-upload"
                type="file"
                accept=".gpkg"
                onChange={handleGpkgFileChange}
                className="sr-only"
                disabled={isBusy}
              />
            </label>
          </div>

          {/* Upload CSV */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Arquivo CSV (Dados Tabulares) <span className="text-red-500">*</span>
            </label>
            <label
              htmlFor="csv-upload"
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center cursor-pointer transition-colors ${
                csvFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-emerald-500'
              }`}
            >
              <FileText className={`h-8 w-8 ${csvFile ? 'text-green-600' : 'text-emerald-500'}`} />
              <div>
                <p className="font-medium text-gray-900">
                  {csvFile ? csvFile.name : 'Clique para selecionar um arquivo .csv'}
                </p>
                <p className="text-sm text-gray-500">
                  Arquivo tabular para exportação em planilhas
                </p>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="sr-only"
                disabled={isBusy}
              />
            </label>
          </div>

          {/* Status dos arquivos selecionados */}
          {(gpkgFile || csvFile) && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900 mb-2">Arquivos selecionados:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <Database
                    className={`h-4 w-4 ${gpkgFile ? 'text-purple-600' : 'text-gray-400'}`}
                  />
                  <span className={gpkgFile ? 'text-gray-700' : 'text-gray-400'}>
                    GPKG: {gpkgFile ? gpkgFile.name : 'Não selecionado'}
                  </span>
                  {gpkgFile && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                </li>
                <li className="flex items-center gap-2">
                  <FileText
                    className={`h-4 w-4 ${csvFile ? 'text-emerald-600' : 'text-gray-400'}`}
                  />
                  <span className={csvFile ? 'text-gray-700' : 'text-gray-400'}>
                    CSV: {csvFile ? csvFile.name : 'Não selecionado'}
                  </span>
                  {csvFile && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </li>
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={!gpkgFile || !csvFile || isBusy}>
              {isBusy ? 'Enviando...' : 'Enviar arquivos'}
            </Button>
            {(phase === 'completed' || phase === 'failed') && (
              <Button variant="outline" onClick={handleReset}>
                Novo upload
              </Button>
            )}
          </div>

          {!gpkgFile && !csvFile && (
            <p className="text-xs text-gray-500">
              Selecione os dois arquivos obrigatórios acima para habilitar o envio.
            </p>
          )}

          {/* Progresso GPKG */}
          {phase === 'uploading-gpkg' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-600" />
                Enviando arquivo GPKG...
              </p>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-purple-500 transition-all"
                  style={{ width: `${gpkgProgress}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-500">{gpkgProgress}%</p>
            </div>
          )}

          {/* Processamento GPKG */}
          {phase === 'processing-gpkg' && (
            <Alert>
              <Database className="h-5 w-5 text-purple-600" />
              <AlertTitle>Processando GPKG</AlertTitle>
              <AlertDescription>
                {backendStatus === 'validating'
                  ? 'Validando estrutura e valores do GPKG...'
                  : 'Arquivo recebido. Processando dados geoespaciais...'}
              </AlertDescription>
            </Alert>
          )}

          {/* Progresso CSV */}
          {phase === 'uploading-csv' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>GPKG processado com sucesso!</span>
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                Enviando arquivo CSV...
              </p>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${csvProgress}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-500">{csvProgress}%</p>
            </div>
          )}

          {/* Sucesso */}
          {phase === 'completed' && statistics && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <AlertTitle>Upload concluído com sucesso!</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-medium">Arquivo GPKG:</p>
                  <ul className="ml-4 list-disc">
                    <li>
                      Features processadas: {statistics.featuresCount.toLocaleString('pt-BR')}
                    </li>
                    <li>
                      Indicadores carregados: {statistics.indicatorsLoaded.toLocaleString('pt-BR')}
                    </li>
                  </ul>
                  <p className="font-medium mt-2">Arquivo CSV:</p>
                  <ul className="ml-4 list-disc">
                    <li>Enviado com sucesso e disponível para exportação</li>
                  </ul>
                  <p className="mt-3 text-green-700 font-medium">
                    Ambos os arquivos foram importados para produção e estão disponíveis na seção
                    "Exportar Dados"!
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Validação falhou</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-2 text-sm">
                  {validationErrors.map((validationError, index) => (
                    <li key={`${validationError.message}-${index}`}>
                      <span className="font-medium">{validationError.type}:</span>{' '}
                      {validationError.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {uploadId && (
        <p className="text-xs text-gray-400">
          ID do upload: <span className="font-mono">{uploadId}</span>
        </p>
      )}
    </div>
  )
}
