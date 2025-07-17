/**
 * Deployment Pipeline Automation Service
 * 
 * Advanced deployment pipeline automation:
 * - Multi-stage pipeline orchestration
 * - Automated testing and validation
 * - Blue-green and canary deployments
 * - Rollback automation
 * - Environment promotion
 * - Approval workflows
 * - Pipeline templates and configurations
 */

import { addMinutes, format } from 'date-fns';

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  repository: string;
  branch: string;
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  environments: string[];
  config: PipelineConfig;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: PipelineRun;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: StageType;
  order: number;
  conditions: StageCondition[];
  actions: StageAction[];
  approvals: ApprovalConfig[];
  timeout: number;
  retryPolicy: RetryPolicy;
  environment?: string;
  parallelExecution: boolean;
  dependencies: string[];
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  trigger: string;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  stages: StageRun[];
  artifacts: Artifact[];
  logs: LogEntry[];
  metrics: RunMetrics;
  rollbackInfo?: RollbackInfo;
}

export interface StageRun {
  id: string;
  stageId: string;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  logs: LogEntry[];
  artifacts: Artifact[];
  metrics: StageMetrics;
  approvals: ApprovalResult[];
  error?: string;
}

export type StageType = 
  | 'build' 
  | 'test' 
  | 'security_scan' 
  | 'deploy' 
  | 'smoke_test' 
  | 'integration_test' 
  | 'performance_test' 
  | 'manual_approval' 
  | 'notification' 
  | 'rollback';

export type RunStatus = 
  | 'pending' 
  | 'running' 
  | 'success' 
  | 'failed' 
  | 'cancelled' 
  | 'waiting_approval' 
  | 'skipped';

export type PipelineStatus = 
  | 'active' 
  | 'paused' 
  | 'disabled' 
  | 'draft';

export interface PipelineTrigger {
  type: 'webhook' | 'schedule' | 'manual' | 'branch_push' | 'pull_request' | 'tag';
  config: Record<string, any>;
  enabled: boolean;
}

export interface PipelineConfig {
  notifications: NotificationConfig[];
  variables: Record<string, string>;
  secrets: string[];
  deploymentStrategy: DeploymentStrategy;
  rollbackStrategy: RollbackStrategy;
  qualityGates: QualityGate[];
  parallelism: number;
  timeout: number;
}

export interface DeploymentStrategy {
  type: 'rolling' | 'blue_green' | 'canary' | 'recreate';
  config: Record<string, any>;
}

export interface RollbackStrategy {
  automatic: boolean;
  triggers: RollbackTrigger[];
  maxRollbackAttempts: number;
  rollbackTimeout: number;
}

export interface QualityGate {
  type: 'test_coverage' | 'security_scan' | 'performance' | 'manual_approval';
  threshold: number;
  required: boolean;
}

export interface StageCondition {
  type: 'branch' | 'environment' | 'previous_stage' | 'variable' | 'time';
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'exists';
  value: string;
}

export interface StageAction {
  type: 'script' | 'docker_build' | 'kubernetes_deploy' | 'test_run' | 'notification';
  config: Record<string, any>;
  timeout: number;
}

export interface ApprovalConfig {
  type: 'manual' | 'automated';
  approvers: string[];
  required: number;
  timeout: number;
}

export interface ApprovalResult {
  id: string;
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  timestamp: Date;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'teams';
  recipients: string[];
  events: string[];
  template: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'binary' | 'image' | 'package' | 'report';
  url: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface RunMetrics {
  buildTime: number;
  testResults: TestResults;
  deploymentTime: number;
  resourceUsage: ResourceUsage;
  qualityMetrics: QualityMetrics;
}

export interface StageMetrics {
  duration: number;
  resourceUsage: ResourceUsage;
  successRate: number;
  errorRate: number;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface QualityMetrics {
  codeQuality: number;
  testCoverage: number;
  securityScore: number;
  performanceScore: number;
}

export interface RollbackInfo {
  reason: string;
  trigger: string;
  previousVersion: string;
  rollbackStrategy: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface RollbackTrigger {
  type: 'error_rate' | 'response_time' | 'health_check' | 'manual';
  threshold: number;
  duration: number;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  type: 'web_app' | 'microservice' | 'mobile_app' | 'data_pipeline' | 'infrastructure';
  stages: Omit<PipelineStage, 'id'>[];
  defaultConfig: Partial<PipelineConfig>;
  variables: Record<string, string>;
}

export class DeploymentPipelineService {
  private pipelines: Map<string, Pipeline> = new Map();
  private runs: Map<string, PipelineRun> = new Map();
  private templates: Map<string, PipelineTemplate> = new Map();
  private activeRuns: Set<string> = new Set();

  constructor() {
    this.initializeTemplates();
  }

  // Pipeline Management
  async createPipeline(pipeline: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pipeline> {
    const newPipeline: Pipeline = {
      ...pipeline,
      id: `pipeline_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pipelines.set(newPipeline.id, newPipeline);
    return newPipeline;
  }

  async updatePipeline(id: string, updates: Partial<Pipeline>): Promise<Pipeline> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) {
      throw new Error(`Pipeline ${id} not found`);
    }

    const updatedPipeline = {
      ...pipeline,
      ...updates,
      updatedAt: new Date(),
    };

    this.pipelines.set(id, updatedPipeline);
    return updatedPipeline;
  }

  async deletePipeline(id: string): Promise<void> {
    if (this.activeRuns.has(id)) {
      throw new Error(`Cannot delete pipeline ${id} - active runs exist`);
    }

    this.pipelines.delete(id);
  }

  async getPipeline(id: string): Promise<Pipeline> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) {
      throw new Error(`Pipeline ${id} not found`);
    }
    return pipeline;
  }

  async listPipelines(): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values());
  }

  // Pipeline Execution
  async triggerPipeline(
    pipelineId: string, 
    trigger: string, 
    variables: Record<string, string> = {}
  ): Promise<PipelineRun> {
    const pipeline = await this.getPipeline(pipelineId);
    
    if (pipeline.status !== 'active') {
      throw new Error(`Pipeline ${pipelineId} is not active`);
    }

    const run: PipelineRun = {
      id: `run_${Date.now()}`,
      pipelineId,
      trigger,
      status: 'pending',
      startedAt: new Date(),
      stages: [],
      artifacts: [],
      logs: [],
      metrics: {
        buildTime: 0,
        testResults: { total: 0, passed: 0, failed: 0, skipped: 0, coverage: 0 },
        deploymentTime: 0,
        resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 },
        qualityMetrics: { codeQuality: 0, testCoverage: 0, securityScore: 0, performanceScore: 0 },
      },
    };

    this.runs.set(run.id, run);
    this.activeRuns.add(run.id);

    // Start execution
    this.executePipeline(run, pipeline, variables);

    return run;
  }

  private async executePipeline(
    run: PipelineRun, 
    pipeline: Pipeline, 
    variables: Record<string, string>
  ): Promise<void> {
    try {
      run.status = 'running';
      this.addLog(run, 'info', `Pipeline execution started: ${pipeline.name}`);

      // Execute stages in order
      for (const stage of pipeline.stages.sort((a, b) => a.order - b.order)) {
        // Check stage conditions
        if (!(await this.checkStageConditions(stage, run, variables))) {
          this.addLog(run, 'info', `Stage ${stage.name} skipped due to conditions`);
          continue;
        }

        // Execute stage
        const stageRun = await this.executeStage(stage, run, pipeline, variables);
        run.stages.push(stageRun);

        // Check if stage failed
        if (stageRun.status === 'failed') {
          run.status = 'failed';
          
          // Check if rollback is needed
          if (await this.shouldRollback(run, pipeline)) {
            await this.executeRollback(run, pipeline);
          }
          
          break;
        }

        // Check if stage is waiting for approval
        if (stageRun.status === 'waiting_approval') {
          run.status = 'waiting_approval';
          break;
        }
      }

      // If all stages completed successfully
      if (run.status === 'running') {
        run.status = 'success';
        this.addLog(run, 'info', 'Pipeline execution completed successfully');
      }

    } catch (error) {
      run.status = 'failed';
      this.addLog(run, 'error', `Pipeline execution failed: ${error}`);
    } finally {
      run.completedAt = new Date();
      run.duration = run.completedAt.getTime() - run.startedAt.getTime();
      this.activeRuns.delete(run.id);
      
      // Send notifications
      await this.sendNotifications(run, pipeline);
    }
  }

  private async executeStage(
    stage: PipelineStage, 
    run: PipelineRun, 
    pipeline: Pipeline,
    variables: Record<string, string>
  ): Promise<StageRun> {
    const stageRun: StageRun = {
      id: `stage_run_${Date.now()}`,
      stageId: stage.id,
      status: 'running',
      startedAt: new Date(),
      logs: [],
      artifacts: [],
      metrics: {
        duration: 0,
        resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 },
        successRate: 0,
        errorRate: 0,
      },
      approvals: [],
    };

    try {
      this.addLog(run, 'info', `Executing stage: ${stage.name}`);

      // Check approvals first
      if (stage.approvals.length > 0) {
        const approvalResult = await this.handleApprovals(stage, stageRun);
        if (!approvalResult) {
          stageRun.status = 'waiting_approval';
          return stageRun;
        }
      }

      // Execute stage actions
      for (const action of stage.actions) {
        await this.executeAction(action, stageRun, run, variables);
      }

      stageRun.status = 'success';
      this.addLog(run, 'info', `Stage ${stage.name} completed successfully`);

    } catch (error) {
      stageRun.status = 'failed';
      stageRun.error = error instanceof Error ? error.message : 'Unknown error';
      this.addLog(run, 'error', `Stage ${stage.name} failed: ${stageRun.error}`);

      // Retry if configured
      if (stage.retryPolicy.enabled) {
        const retryResult = await this.retryStage(stage, stageRun, run, variables);
        if (retryResult.status === 'success') {
          stageRun.status = 'success';
        }
      }
    } finally {
      stageRun.completedAt = new Date();
      stageRun.duration = stageRun.completedAt.getTime() - stageRun.startedAt.getTime();
    }

    return stageRun;
  }

  private async executeAction(
    action: StageAction, 
    stageRun: StageRun, 
    run: PipelineRun,
    variables: Record<string, string>
  ): Promise<void> {
    switch (action.type) {
      case 'script':
        await this.executeScript(action, stageRun, variables);
        break;
      case 'docker_build':
        await this.executeDockerBuild(action, stageRun, variables);
        break;
      case 'kubernetes_deploy':
        await this.executeKubernetesDeploy(action, stageRun, variables);
        break;
      case 'test_run':
        await this.executeTestRun(action, stageRun, run, variables);
        break;
      case 'notification':
        await this.executeNotification(action, stageRun, variables);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeScript(
    action: StageAction, 
    stageRun: StageRun, 
    variables: Record<string, string>
  ): Promise<void> {
    const script = action.config.script as string;
    const timeout = action.timeout || 300000; // 5 minutes default

    // Simulate script execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    stageRun.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Executing script: ${script}`,
      source: 'script_executor',
    });

    // Mock success/failure
    if (Math.random() < 0.9) {
      stageRun.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Script executed successfully',
        source: 'script_executor',
      });
    } else {
      throw new Error('Script execution failed');
    }
  }

  private async executeDockerBuild(
    action: StageAction, 
    stageRun: StageRun, 
    variables: Record<string, string>
  ): Promise<void> {
    const dockerfile = action.config.dockerfile as string;
    const tag = action.config.tag as string;

    // Simulate Docker build
    await new Promise(resolve => setTimeout(resolve, 5000));

    stageRun.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Building Docker image: ${tag}`,
      source: 'docker_builder',
    });

    // Create artifact
    const artifact: Artifact = {
      id: `artifact_${Date.now()}`,
      name: `docker-image-${tag}`,
      type: 'image',
      url: `registry.example.com/${tag}`,
      size: Math.floor(Math.random() * 1000000000), // Random size
      checksum: `sha256:${Math.random().toString(36).substring(2, 15)}`,
      metadata: { tag, dockerfile },
    };

    stageRun.artifacts.push(artifact);
  }

  private async executeKubernetesDeploy(
    action: StageAction, 
    stageRun: StageRun, 
    variables: Record<string, string>
  ): Promise<void> {
    const namespace = action.config.namespace as string;
    const deployment = action.config.deployment as string;

    // Simulate Kubernetes deployment
    await new Promise(resolve => setTimeout(resolve, 3000));

    stageRun.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Deploying to Kubernetes: ${namespace}/${deployment}`,
      source: 'kubernetes_deployer',
    });

    // Update metrics
    stageRun.metrics.resourceUsage = {
      cpu: Math.random() * 100,
      memory: Math.random() * 1000,
      disk: Math.random() * 10000,
      network: Math.random() * 1000,
    };
  }

  private async executeTestRun(
    action: StageAction, 
    stageRun: StageRun, 
    run: PipelineRun,
    variables: Record<string, string>
  ): Promise<void> {
    const testSuite = action.config.testSuite as string;
    const testType = action.config.testType as string;

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock test results
    const total = Math.floor(Math.random() * 100) + 50;
    const passed = Math.floor(total * (0.8 + Math.random() * 0.15));
    const failed = total - passed;
    const coverage = Math.floor(Math.random() * 30) + 70;

    const testResults: TestResults = {
      total,
      passed,
      failed,
      skipped: 0,
      coverage,
    };

    run.metrics.testResults = testResults;

    stageRun.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Test results: ${passed}/${total} passed, ${coverage}% coverage`,
      source: 'test_runner',
    });

    // Fail if test failure rate is too high
    if (failed / total > 0.1) {
      throw new Error(`Test failure rate too high: ${failed}/${total}`);
    }
  }

  private async executeNotification(
    action: StageAction, 
    stageRun: StageRun, 
    variables: Record<string, string>
  ): Promise<void> {
    const message = action.config.message as string;
    const recipients = action.config.recipients as string[];

    stageRun.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Notification sent to: ${recipients.join(', ')}`,
      source: 'notification_sender',
    });
  }

  private async handleApprovals(stage: PipelineStage, stageRun: StageRun): Promise<boolean> {
    for (const approval of stage.approvals) {
      if (approval.type === 'manual') {
        // Create approval requests
        for (const approver of approval.approvers) {
          const approvalResult: ApprovalResult = {
            id: `approval_${Date.now()}`,
            approver,
            status: 'pending',
            timestamp: new Date(),
          };
          stageRun.approvals.push(approvalResult);
        }
        
        // In real implementation, this would wait for actual approvals
        // For now, simulate approval
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        stageRun.approvals.forEach(approval => {
          approval.status = Math.random() < 0.8 ? 'approved' : 'rejected';
        });

        const approvedCount = stageRun.approvals.filter(a => a.status === 'approved').length;
        
        if (approvedCount < approval.required) {
          return false;
        }
      }
    }
    
    return true;
  }

  private async retryStage(
    stage: PipelineStage, 
    stageRun: StageRun, 
    run: PipelineRun,
    variables: Record<string, string>
  ): Promise<StageRun> {
    const policy = stage.retryPolicy;
    
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        stageRun.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Retry attempt ${attempt}/${policy.maxAttempts}`,
          source: 'retry_handler',
        });

        // Wait with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(policy.backoffMultiplier, attempt - 1))
        );

        // Re-execute stage actions
        for (const action of stage.actions) {
          await this.executeAction(action, stageRun, run, variables);
        }

        stageRun.status = 'success';
        return stageRun;

      } catch (error) {
        stageRun.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `Retry attempt ${attempt} failed: ${error}`,
          source: 'retry_handler',
        });
      }
    }

    return stageRun;
  }

  private async shouldRollback(run: PipelineRun, pipeline: Pipeline): Promise<boolean> {
    const rollbackStrategy = pipeline.config.rollbackStrategy;
    
    if (!rollbackStrategy.automatic) {
      return false;
    }

    // Check rollback triggers
    for (const trigger of rollbackStrategy.triggers) {
      if (await this.checkRollbackTrigger(trigger, run)) {
        return true;
      }
    }

    return false;
  }

  private async checkRollbackTrigger(trigger: RollbackTrigger, run: PipelineRun): Promise<boolean> {
    switch (trigger.type) {
      case 'error_rate':
        return run.metrics.testResults.failed / run.metrics.testResults.total > trigger.threshold;
      case 'response_time':
        return false; // Would check actual response times
      case 'health_check':
        return false; // Would check health endpoints
      case 'manual':
        return false; // Would wait for manual trigger
      default:
        return false;
    }
  }

  private async executeRollback(run: PipelineRun, pipeline: Pipeline): Promise<void> {
    const rollbackInfo: RollbackInfo = {
      reason: 'Automatic rollback triggered',
      trigger: 'pipeline_failure',
      previousVersion: 'v1.0.0', // Would get from deployment history
      rollbackStrategy: pipeline.config.rollbackStrategy.toString(),
      startedAt: new Date(),
    };

    run.rollbackInfo = rollbackInfo;
    
    this.addLog(run, 'info', 'Initiating rollback');

    // Simulate rollback process
    await new Promise(resolve => setTimeout(resolve, 5000));

    rollbackInfo.completedAt = new Date();
    
    this.addLog(run, 'info', 'Rollback completed successfully');
  }

  private async checkStageConditions(
    stage: PipelineStage, 
    run: PipelineRun, 
    variables: Record<string, string>
  ): Promise<boolean> {
    for (const condition of stage.conditions) {
      if (!(await this.evaluateCondition(condition, run, variables))) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(
    condition: StageCondition, 
    run: PipelineRun, 
    variables: Record<string, string>
  ): Promise<boolean> {
    switch (condition.type) {
      case 'branch':
        return this.evaluateStringCondition(variables.branch || 'main', condition.operator, condition.value);
      case 'environment':
        return this.evaluateStringCondition(variables.environment || 'dev', condition.operator, condition.value);
      case 'variable':
        return this.evaluateStringCondition(variables[condition.value] || '', condition.operator, condition.value);
      case 'previous_stage':
        const previousStage = run.stages.find(s => s.stageId === condition.value);
        return previousStage ? previousStage.status === 'success' : false;
      case 'time':
        return true; // Would implement time-based conditions
      default:
        return true;
    }
  }

  private evaluateStringCondition(value: string, operator: string, expected: string): boolean {
    switch (operator) {
      case 'equals':
        return value === expected;
      case 'not_equals':
        return value !== expected;
      case 'contains':
        return value.includes(expected);
      case 'exists':
        return value !== '';
      default:
        return true;
    }
  }

  private async sendNotifications(run: PipelineRun, pipeline: Pipeline): Promise<void> {
    for (const notification of pipeline.config.notifications) {
      if (notification.events.includes(run.status)) {
        // Simulate notification sending
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.addLog(run, 'info', `Notification sent via ${notification.type} to ${notification.recipients.join(', ')}`);
      }
    }
  }

  private addLog(run: PipelineRun, level: LogEntry['level'], message: string): void {
    run.logs.push({
      timestamp: new Date(),
      level,
      message,
      source: 'pipeline_orchestrator',
    });
  }

  // Pipeline Templates
  private initializeTemplates(): void {
    const webAppTemplate: PipelineTemplate = {
      id: 'web_app',
      name: 'Web Application',
      description: 'Standard web application deployment pipeline',
      type: 'web_app',
      stages: [
        {
          name: 'Build',
          type: 'build',
          order: 1,
          conditions: [],
          actions: [
            { type: 'script', config: { script: 'npm run build' }, timeout: 300000 }
          ],
          approvals: [],
          timeout: 600000,
          retryPolicy: { enabled: true, maxAttempts: 2, backoffMultiplier: 2, retryableErrors: [] },
          parallelExecution: false,
          dependencies: [],
        },
        {
          name: 'Test',
          type: 'test',
          order: 2,
          conditions: [],
          actions: [
            { type: 'test_run', config: { testSuite: 'unit', testType: 'jest' }, timeout: 300000 }
          ],
          approvals: [],
          timeout: 600000,
          retryPolicy: { enabled: true, maxAttempts: 2, backoffMultiplier: 2, retryableErrors: [] },
          parallelExecution: false,
          dependencies: ['Build'],
        },
        {
          name: 'Deploy to Staging',
          type: 'deploy',
          order: 3,
          conditions: [],
          actions: [
            { type: 'kubernetes_deploy', config: { namespace: 'staging', deployment: 'web-app' }, timeout: 300000 }
          ],
          approvals: [],
          timeout: 600000,
          retryPolicy: { enabled: true, maxAttempts: 2, backoffMultiplier: 2, retryableErrors: [] },
          environment: 'staging',
          parallelExecution: false,
          dependencies: ['Test'],
        },
        {
          name: 'Production Approval',
          type: 'manual_approval',
          order: 4,
          conditions: [],
          actions: [],
          approvals: [
            { type: 'manual', approvers: ['admin@example.com'], required: 1, timeout: 3600000 }
          ],
          timeout: 3600000,
          retryPolicy: { enabled: false, maxAttempts: 1, backoffMultiplier: 1, retryableErrors: [] },
          parallelExecution: false,
          dependencies: ['Deploy to Staging'],
        },
        {
          name: 'Deploy to Production',
          type: 'deploy',
          order: 5,
          conditions: [],
          actions: [
            { type: 'kubernetes_deploy', config: { namespace: 'production', deployment: 'web-app' }, timeout: 300000 }
          ],
          approvals: [],
          timeout: 600000,
          retryPolicy: { enabled: true, maxAttempts: 2, backoffMultiplier: 2, retryableErrors: [] },
          environment: 'production',
          parallelExecution: false,
          dependencies: ['Production Approval'],
        },
      ],
      defaultConfig: {
        notifications: [
          { type: 'email', recipients: ['team@example.com'], events: ['success', 'failed'], template: 'default' }
        ],
        variables: {},
        secrets: [],
        deploymentStrategy: { type: 'rolling', config: {} },
        rollbackStrategy: { automatic: true, triggers: [], maxRollbackAttempts: 3, rollbackTimeout: 300000 },
        qualityGates: [],
        parallelism: 1,
        timeout: 3600000,
      },
      variables: {
        branch: 'main',
        environment: 'production',
      },
    };

    this.templates.set(webAppTemplate.id, webAppTemplate);
  }

  async getTemplates(): Promise<PipelineTemplate[]> {
    return Array.from(this.templates.values());
  }

  async createPipelineFromTemplate(
    templateId: string, 
    config: Partial<Pipeline>
  ): Promise<Pipeline> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const pipeline: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt'> = {
      name: config.name || template.name,
      description: config.description || template.description,
      repository: config.repository || '',
      branch: config.branch || 'main',
      stages: template.stages.map((stage, index) => ({
        ...stage,
        id: `stage_${index}`,
      })),
      triggers: config.triggers || [],
      environments: config.environments || ['dev', 'staging', 'production'],
      config: { ...template.defaultConfig, ...config.config },
      status: 'draft',
    };

    return this.createPipeline(pipeline);
  }

  // Run Management
  async getPipelineRun(runId: string): Promise<PipelineRun> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }
    return run;
  }

  async listPipelineRuns(pipelineId?: string): Promise<PipelineRun[]> {
    const runs = Array.from(this.runs.values());
    return pipelineId ? runs.filter(run => run.pipelineId === pipelineId) : runs;
  }

  async cancelPipelineRun(runId: string): Promise<void> {
    const run = await this.getPipelineRun(runId);
    
    if (run.status === 'running') {
      run.status = 'cancelled';
      run.completedAt = new Date();
      run.duration = run.completedAt.getTime() - run.startedAt.getTime();
      
      this.activeRuns.delete(runId);
      this.addLog(run, 'info', 'Pipeline run cancelled');
    }
  }

  async approvePipelineStage(runId: string, stageId: string, approver: string, approved: boolean, comment?: string): Promise<void> {
    const run = await this.getPipelineRun(runId);
    const stageRun = run.stages.find(s => s.stageId === stageId);
    
    if (!stageRun) {
      throw new Error(`Stage ${stageId} not found in run ${runId}`);
    }

    const approval = stageRun.approvals.find(a => a.approver === approver && a.status === 'pending');
    if (!approval) {
      throw new Error(`Approval not found for ${approver} in stage ${stageId}`);
    }

    approval.status = approved ? 'approved' : 'rejected';
    approval.comment = comment;
    approval.timestamp = new Date();

    // Check if enough approvals
    const stage = (await this.getPipeline(run.pipelineId)).stages.find(s => s.id === stageId);
    if (stage) {
      const approvalConfig = stage.approvals.find(a => a.approvers.includes(approver));
      if (approvalConfig) {
        const approvedCount = stageRun.approvals.filter(a => a.status === 'approved').length;
        if (approvedCount >= approvalConfig.required) {
          // Continue pipeline execution
          stageRun.status = 'success';
          if (run.status === 'waiting_approval') {
            run.status = 'running';
            // Resume pipeline execution
            const pipeline = await this.getPipeline(run.pipelineId);
            this.executePipeline(run, pipeline, {});
          }
        }
      }
    }
  }

  // Metrics and Analytics
  async getPipelineMetrics(pipelineId: string, timeRange: string = '7d'): Promise<any> {
    const runs = await this.listPipelineRuns(pipelineId);
    const recentRuns = runs.slice(-50); // Last 50 runs

    const successRate = recentRuns.filter(r => r.status === 'success').length / recentRuns.length;
    const averageDuration = recentRuns.reduce((sum, r) => sum + (r.duration || 0), 0) / recentRuns.length;
    const failureRate = recentRuns.filter(r => r.status === 'failed').length / recentRuns.length;

    return {
      successRate,
      averageDuration,
      failureRate,
      totalRuns: recentRuns.length,
      trends: this.calculateTrends(recentRuns),
    };
  }

  private calculateTrends(runs: PipelineRun[]): any {
    // Calculate trends over time
    const timeGroups = runs.reduce((groups, run) => {
      const date = run.startedAt.toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(run);
      return groups;
    }, {} as Record<string, PipelineRun[]>);

    return Object.entries(timeGroups).map(([date, runs]) => ({
      date,
      runs: runs.length,
      success: runs.filter(r => r.status === 'success').length,
      failed: runs.filter(r => r.status === 'failed').length,
      avgDuration: runs.reduce((sum, r) => sum + (r.duration || 0), 0) / runs.length,
    }));
  }

  // Cleanup
  clearCompletedRuns(): void {
    for (const [runId, run] of this.runs) {
      if (run.status !== 'running' && run.status !== 'waiting_approval') {
        this.runs.delete(runId);
      }
    }
  }

  getStats(): Record<string, any> {
    return {
      totalPipelines: this.pipelines.size,
      totalRuns: this.runs.size,
      activeRuns: this.activeRuns.size,
      templates: this.templates.size,
    };
  }
}

// Export singleton instance
export const deploymentPipelineService = new DeploymentPipelineService();

export default DeploymentPipelineService;