import { join } from 'path';
import * as chalk from 'chalk';
import {
  ExecutorContext,
  logger,
  readJsonFile,
  writeJsonFile,
} from '@nx/devkit';

import { ReactNativeSyncDepsOptions } from './schema';
import { PackageJson } from 'nx/src/utils/package-json';

export interface ReactNativeSyncDepsOutput {
  success: boolean;
}

export default async function* syncDepsExecutor(
  options: ReactNativeSyncDepsOptions,
  context: ExecutorContext
): AsyncGenerator<ReactNativeSyncDepsOutput> {
  const projectRoot =
    context.projectsConfigurations.projects[context.projectName].root;

  const workspacePackageJsonPath = join(context.root, 'package.json');
  const projectPackageJsonPath = join(
    context.root,
    projectRoot,
    'package.json'
  );

  const workspacePackageJson = readJsonFile(workspacePackageJsonPath);
  const projectPackageJson = readJsonFile(projectPackageJsonPath);
  displayNewlyAddedDepsMessage(
    context.projectName,
    await syncDeps(
      projectPackageJson,
      projectPackageJsonPath,
      workspacePackageJson,
      typeof options.include === 'string'
        ? options.include.split(',')
        : options.include,
      typeof options.exclude === 'string'
        ? options.exclude.split(',')
        : options.exclude
    )
  );

  yield { success: true };
}

export async function syncDeps(
  projectPackageJson: PackageJson,
  projectPackageJsonPath: string,
  workspacePackageJson: PackageJson,
  include: string[] = [],
  exclude: string[] = []
): Promise<string[]> {
  let npmDeps = Object.keys(workspacePackageJson.dependencies || {});
  let npmDevdeps = Object.keys(workspacePackageJson.devDependencies || {});

  const newDeps = [];
  let updated = false;

  if (!projectPackageJson.dependencies) {
    projectPackageJson.dependencies = {};
    updated = true;
  }

  if (include && include.length) {
    npmDeps.push(...include);
  }
  if (exclude && exclude.length) {
    npmDeps = npmDeps.filter((dep) => !exclude.includes(dep));
  }

  if (!projectPackageJson.devDependencies) {
    projectPackageJson.devDependencies = {};
  }
  if (!projectPackageJson.dependencies) {
    projectPackageJson.dependencies = {};
  }

  npmDeps.forEach((dep) => {
    if (
      !projectPackageJson.dependencies[dep] &&
      !projectPackageJson.devDependencies[dep]
    ) {
      projectPackageJson.dependencies[dep] = '*';
      newDeps.push(dep);
      updated = true;
    }
  });
  npmDevdeps.forEach((dep) => {
    if (
      !projectPackageJson.dependencies[dep] &&
      !projectPackageJson.devDependencies[dep]
    ) {
      projectPackageJson.devDependencies[dep] = '*';
      newDeps.push(dep);
      updated = true;
    }
  });

  if (updated) {
    writeJsonFile(projectPackageJsonPath, projectPackageJson);
  }

  return newDeps;
}

export function displayNewlyAddedDepsMessage(
  projectName: string,
  deps: string[]
) {
  if (deps.length > 0) {
    logger.info(`${chalk.bold.cyan(
      'info'
    )} Added entries to 'package.json' for '${projectName}' (for autolink):
  ${deps.map((d) => chalk.bold.cyan(`"${d}": "*"`)).join('\n  ')}`);
  } else {
    logger.info(
      `${chalk.bold.cyan(
        'info'
      )} Dependencies for '${projectName}' are up to date! No changes made.`
    );
  }
}
