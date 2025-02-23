import {Command, OptionValues} from 'commander';

export class Args {
    dryRun: boolean;
    lookBackPeriod: number;
    endTime: Date;
    startTime: Date;

    constructor(options: OptionValues) {
        this.dryRun = options.dryRun !== 'false';
        this.lookBackPeriod = parseInt(options.lookBackPeriod);
        this.endTime = getEndTime(options.currentTime);
        this.startTime = new Date(this.endTime.getTime() - this.lookBackPeriod * 60 * 60 * 1000);
    }
}

/**
 * Truncates the given date to the latest whole hour.
 * @param date The date to truncate.
 * @returns The truncated date.
 */
const truncateToHour = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
};

/**
 * Gets the run time, truncated to the latest whole hour.
 * @param runTimeParam Optional run time parameter.
 * @returns The truncated run time.
 */
const getEndTime = (runTimeParam?: string): Date => {
    const runTime = runTimeParam ? new Date(runTimeParam) : new Date();
    return truncateToHour(runTime);
};

const program = new Command();

program
    .option('-d, --dryRun <boolean>', 'Dry Run without posting ', 'true')
    .option('-l, --lookBackPeriod <number>', 'The number of hours to look back', '1') // Default: 1 hour
    .option('-t, --currentTime <string>', 'The current time (ISO string)');
// Parse process arguments
program.parse(process.argv);
const options = program.opts(); // Retrieves the parsed options

// Initialize the Args
export const args = new Args(options);

