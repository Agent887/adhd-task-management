import * as fs from 'fs';
import * as path from 'path';

interface BuildLockConfig {
  currentPhase: string;
  currentWeek: string;
  currentDay: string;
  phases: {
    [key: string]: {
      name: string;
      locked?: boolean;
      requiresPhase?: string;
      weeks?: {
        [key: string]: {
          name: string;
          requiredFiles?: string[];
          requiredDependencies?: string[];
        };
      };
    };
  };
}

class BuildLock {
  private config: BuildLockConfig;
  private configPath: string;

  constructor() {
    this.configPath = path.resolve(process.cwd(), 'build-lock.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): BuildLockConfig {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      throw new Error('Failed to load build-lock.json');
    }
  }

  public validateCurrentPhase(): void {
    const { currentPhase, phases } = this.config;
    const phase = phases[currentPhase];

    if (!phase) {
      throw new Error(`Invalid phase: ${currentPhase}`);
    }

    if (phase.requiresPhase) {
      const requiredPhase = phases[phase.requiresPhase];
      if (requiredPhase.locked) {
        throw new Error(
          `Phase ${currentPhase} requires completion of phase ${phase.requiresPhase}`
        );
      }
    }
  }

  public validateCurrentWeek(): void {
    const { currentPhase, currentWeek, phases } = this.config;
    const phase = phases[currentPhase];
    const week = phase.weeks?.[currentWeek];

    if (!week) {
      throw new Error(`Invalid week: ${currentWeek} in phase ${currentPhase}`);
    }

    // Validate required files
    if (week.requiredFiles) {
      for (const file of week.requiredFiles) {
        const filePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          throw new Error(
            `Required file missing for week ${currentWeek}: ${file}`
          );
        }
      }
    }

    // Validate required dependencies
    if (week.requiredDependencies) {
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      for (const dep of week.requiredDependencies) {
        if (!dependencies[dep]) {
          throw new Error(
            `Required dependency missing for week ${currentWeek}: ${dep}`
          );
        }
      }
    }
  }

  public advancePhase(): void {
    const nextPhase = String(Number(this.config.currentPhase) + 1);
    if (!this.config.phases[nextPhase]) {
      throw new Error('No more phases to advance to');
    }

    this.config.currentPhase = nextPhase;
    this.config.currentWeek = '1';
    this.config.currentDay = '1';
    this.saveConfig();
  }

  public advanceWeek(): void {
    const nextWeek = String(Number(this.config.currentWeek) + 1);
    const phase = this.config.phases[this.config.currentPhase];
    
    if (!phase.weeks?.[nextWeek]) {
      throw new Error('No more weeks in this phase');
    }

    this.config.currentWeek = nextWeek;
    this.config.currentDay = '1';
    this.saveConfig();
  }

  public advanceDay(): void {
    const nextDay = String(Number(this.config.currentDay) + 1);
    if (Number(nextDay) > 5) {
      throw new Error('No more days in this week');
    }

    this.config.currentDay = nextDay;
    this.saveConfig();
  }

  private saveConfig(): void {
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  public getCurrentStatus(): string {
    const { currentPhase, currentWeek, currentDay, phases } = this.config;
    const phase = phases[currentPhase];
    const week = phase.weeks?.[currentWeek];

    return `
Current Status:
Phase: ${currentPhase} - ${phase.name}
Week: ${currentWeek} - ${week?.name || 'N/A'}
Day: ${currentDay}
    `.trim();
  }
}

export const buildLock = new BuildLock();
