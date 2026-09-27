import * as fs from 'fs';
import * as path from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DailyReport } from './types';

/** Port for report persistence; ops-service is the only owner of this data. */
export interface ReportStore {
  get(date: string): Promise<DailyReport | null>;
  put(report: DailyReport): Promise<void>;
}

/** Table ops-daily-reports: PK report_date (S). */
export class DynamoReportStore implements ReportStore {
  private readonly doc: DynamoDBDocumentClient;

  constructor(private readonly table: string, region: string) {
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async get(date: string): Promise<DailyReport | null> {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { report_date: date } }));
    return (r.Item as DailyReport) ?? null;
  }

  async put(report: DailyReport): Promise<void> {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: report }));
  }
}

/** Local-dev adapter: one JSON file per day under data/reports/. */
export class FileReportStore implements ReportStore {
  constructor(private readonly dir: string) {}

  private file(date: string): string {
    return path.join(this.dir, `${date}.json`);
  }

  async get(date: string): Promise<DailyReport | null> {
    const f = this.file(date);
    return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as DailyReport) : null;
  }

  async put(report: DailyReport): Promise<void> {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.file(report.report_date), JSON.stringify(report, null, 2), 'utf8');
  }
}
