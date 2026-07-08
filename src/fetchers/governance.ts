import { safeGet } from '../util/http.js';
import { UNI_SNAPSHOT_SPACE } from '../util/constants.js';
import type { GovernanceData } from '../types/snapshot.js';

interface SnapshotProposal {
  id: string;
  title: string;
  state: string;
  end: number;
  link?: string;
}

interface SnapshotResponse {
  data: { proposals: SnapshotProposal[] };
}

export async function fetchGovernance(errors: string[]): Promise<GovernanceData> {
  const query = `
    query {
      proposals(
        first: 10,
        skip: 0,
        where: { space_in: ["${UNI_SNAPSHOT_SPACE}"], state: "active" },
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        state
        end
        link
      }
    }
  `;

  const res = await safeGet<SnapshotResponse>(
    `https://hub.snapshot.org/graphql?query=${encodeURIComponent(query)}`,
    {},
    errors,
    'snapshot:uniswap'
  );

  const active =
    res?.data?.proposals?.map((p) => ({
      title: p.title,
      status: p.state,
      url: p.link ?? `https://snapshot.org/#/${UNI_SNAPSHOT_SPACE}/proposal/${p.id}`,
    })) ?? [];

  // Recent forum discussion – Discourse JSON endpoint
  const forum = await safeGet<{ topic_list?: { topics: Array<{ title: string; slug: string; id: number }> } }>(
    'https://gov.uniswap.org/latest.json?order=created',
    {},
    errors,
    'uni-forum:latest'
  );

  const recentDiscussion = forum?.topic_list?.topics
    ?.slice(0, 5)
    .map((t) => `${t.title} (https://gov.uniswap.org/t/${t.slug}/${t.id})`) ?? [];

  return {
    activeProposals: active,
    recentDiscussion,
  };
}
